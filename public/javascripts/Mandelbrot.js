
// Each tile has an upper left corner origin, a width and a height. All measured in pixels.
class Tile {
    constructor (x, y, width, height){
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    // Factory to break a rectangular region into smaller ones.
    static *tiles(width, height, numRows, numCols){
        let columnWidth = Math.floor(width/numCols);
        let rowHeight = Math.floor(height/numRows);

        for(let row = 0; row < numRows; row++){
            let tileHeight = (row < numRows - 1) ? rowHeight : height - rowHeight * (numRows - 1);
            for(let col = 0; col < numCols; col++){
                let tileWidth = (col < numCols - 1) ? columnWidth : width - columnWidth * (numCols - 1);

                yield  new Tile(col * columnWidth, row * rowHeight, tileWidth, tileHeight);
            }
        }
    }
}

class WorkerPool {
    constructor (numWorkers, workerSource){
        this.idleWorkers = [];
        this.workQueue = [];
        this.workerMap = new Map();

        for(let i = 0; i < numWorkers; i++){
            let worker = new Worker(workerSource);
            worker.onmessage = (message => {
                this._workerDone(worker, null, message.data);
            });
            worker.onerror = (error => {
                this._workerDone(worker, error, null);
            });
            this.idleWorkers[i] = worker;
        }
    }

    // Settle the worker promise.
    _workerDone(worker, error, response){
        let [resolve, reject] = this.workerMap.get(worker);
        this.workerMap.delete(worker);

        if(this.workQueue.length === 0){
            this.idleWorkers.push(worker);
        }
        else{
            let [data, resolve, reject] = this.workQueue.shift();
            this.workerMap.set(worker, [resolve, reject]);
            worker.postMessage(data);
        }

        (error === null) ? resolve(response) : reject(error);
    }

    // Create a promise, activate async work using data for the last idle worker.
    addWork(data){
        return new Promise((resolve, reject) => {
            if(this.idleWorkers.length > 0){
                let worker = this.idleWorkers.pop();
                this.workerMap.set(worker, [resolve, reject]);
                worker.postMessage(data);
            }
            else{
                this.workQueue.push([data, resolve, reject]);
            }
        });
    }
}

// perPixel is a numeric value ascribed as pixel side (size), used in computation of Mandelbrot algorithm.
class PageState{
    static initialState(canvas){
        let s = new PageState();

        // To keep the entire mandelbrot visible area in the middle of the canvas.
        // Center of the canvas relative to the complex plane coordinate system in pixels.
        s.cx = -canvas.width / 8;
        s.cy = 0;

        // Numeric value to scale pixel size to complex plain.
        s.perPixel = 8 / (canvas.height + canvas.width);  

        s.maxIterations = 500;
        return s;
    }

    static fromURL(url){
        let s = new PageState();
        let u = new URL(url);
        s.cx = parseFloat(u.searchParams.get("cx"));
        s.cy = parseFloat(u.searchParams.get("cy"));
        s.perPixel = parseFloat(u.searchParams.get("pp"));
        s.maxIterations = parseInt(u.searchParams.get("it"));
        return (isNaN(s.cx), isNaN(s.cy), isNaN(s.perPixel), isNaN(s.maxIterations)) ? null : s;
    }

    toURL(){
        let u = new URL(window.location);
        u.searchParams.set("cx", this.cx);
        u.searchParams.set("cy", this.cy);
        u.searchParams.set("pp", this.perPixel);
        u.searchParams.set("it", this.maxIterations);
        return u.href;
    }
}

const ROWS = 3, COLS = 4, NUMWORKERS = navigator.hardwareConcurrency || 2;

class mandelbrotCanvas{
    constructor(canvas){
        this.canvas = canvas;
        this.context = canvas.getContext("2d");
        
        // Physical sizes per hardware pixels.
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.workerPool = new WorkerPool(NUMWORKERS, "/javascripts/MandelWork.js");

        this.tiles = null;
        this.pendingRender = null;
        this.wantsRenderer = false;
        this.resizeTimer = null;
        this.colorTable = null;

        this.canvas.addEventListener("pointerdown", e => this.handlePointer(e));
        window.addEventListener("keydown", e => this.handleKey(e));
        window.addEventListener("resize", e => this.handleResize(e));
        window.addEventListener("popstate", e => this.setState(e.state, true));

        let fromURL = PageState.fromURL(window.location);
        let fromInit = PageState.initialState(this.canvas);
        this.state = (fromURL || fromInit);

        history.replaceState(this.state, "", this.state.toURL());
        this.tiles = [...Tile.tiles(this.width, this.height, ROWS, COLS)];
        this.render();
    } 
        
    setState(f, poped=false){
        if(typeof f === "function"){
            f(this.state);
        }
        else{
            for(let property in f){
                this.state[property] = f[property];
            }
        }

        if(!poped){
            history.pushState(this.state, "", this.state.toURL());
            this.render();
        }
    }

    render(){
        if(this.pendingRender){
            this.wantRenderer = true;
            return;
        }

        // x0, and y0 origin of canvas. (Upper left corner) measured in complex plane coordinate system in pixel.
        let {cx, cy, perPixel, maxIterations} = this.state;
        let x0 = cx - this.width / 2;
        let y0 = cy - this.height / 2;

        // Apply computation for every tile.
        let promises = this.tiles.map(tile => this.workerPool.addWork({
            tile: tile,
            x0: x0 + tile.x,
            y0: y0 + tile.y,
            perPixel: perPixel,
            maxIterations: maxIterations
        }));

        // After all computations are done.
        this.pendingRender = Promise.all(promises).then(responses => {

            // Find min and max number of iterations for all tiles.
            let min = maxIterations, max = 0;
            for(let r of responses){
                if(r.min < min) min = r.min;
                if(r.max > max) max = r.max;
            }

            // Allocate for a color table
            if(!this.colorTable || this.colorTable.length !== max - min + 1){
                this.colorTable = new Uint32Array(max - min + 1);
            }

            // Setup a color table corresponding to each iteration value.
            if(min < max){
                let maxlog = Math.log (max - min + 1);
                for(let i = min; i <= max; i++){
                    this.colorTable[i] = Math.ceil((Math.log (i - min + 1)/ maxlog) * (Math.pow(2, 32) - 1) >> 8);
                }
            }
            else{ 
                if(min === maxIterations){
                    this.colortable[min] = 0xFF000000;
                }
                else{
                    this.colortable[min] = 0;
                }
            }

            // Assign and fillup colors of tiles.
            for(let r of responses){

                // For each tile, replace the number of iterations for each pixel with a color (a 32 bit value).
                let iterations = new Uint32Array(r.imageData.data.buffer);
                for(let i = 0; i < iterations.length; i++){
                    iterations[i] = this.colorTable[iterations[i]];
                }
                // Fillup tile colors.
                this.context.putImageData(r.imageData, r.tile.x, r.tile.y);
            }

            this.canvas.style.transform = "";
        })
        .catch(reason => {
            console.error("Promise rejected in render():", reason);
        })
        .finally(() => {
            this.pendingRender = null;
            if(this.wantRenderer){ 
                this.wantRenderer = false;
                this.render();
            }
        });
    }

    handleResize(event){
        if(this.resizeTimer){
            clearTimeout(this.resizeTimer);
        }
        this.resizeTimer = setTimeout(() =>{
            this.resizeTimer = null;
            this.tiles = [...Tile.tiles(this.width, this.height, ROWS, COLS)];
            this.render();
        }, 200);
    }
    handleKey(event){
        event.preventDefault();
        switch(event.key){
            case "Escape" :
                this.setState(PageState.initialState(this.canvas));
                break;
            case "+" :
                this.setState(s => {
                    s.maxIterations = Math.round(s.maxIterations * 1.5);
                });
                break;
            case"-" :
                this.setState(s => {
                    s.maxIterations = Math.round(s.maxIterations / 1.5);
                    if(s.maxIterations < 1){
                        s.maxIterations = 1;
                    }
                });
                break;
            case"o":
                this.setState(s => s.perPixel *= 1.5);
                break;
            case "ArrowUp" :
                this.setState(s => s.cy += this.height / 10);
                break;
            case "ArrowDown" :
                this.setState(s => s.cy -= this.height / 10);
                break;
            case "ArrowLeft" :
                this.setState(s => s.cx += this.width / 10 );
                break;
            case "ArrowRight" :
                this.setState(s => s.cx -= this.width / 10);
                break;
            default:
        }
    }
    handlePointer(event){
        // Clicked location in window coordinates. (Upeer left corner)
        const x0 = event.clientX, y0 = event.clientY, t0 = Date.now();

        // Top, right, bottom, left coordinates of the box around canvas relative to top-left window corner. Includes border.
        let rect = this.canvas.getBoundingClientRect();

        // offsetWidth, includes border, clientWidth includes padding only. Computed values are border thickness in x and y directions.
        let offWidth = (this.canvas.offsetWidth - this.canvas.clientWidth) / 2;
        let offHeight = (this.canvas.offsetHeight - this.canvas.clientHeight) / 2;

        // Clicked point in canvas coordinate system at its upper left.
        let x00 = x0 - rect.left - offWidth;
        let y00 = y0 - rect.top - offHeight;

        const {cx, cy} = this.state;
        let moved = false;
        const pointerMoveHandler = event => {
            let dx = event.clientX - x0, dy = event.clientY - y0;

            this.setState(s => {
                s.cx = cx - dx;
                s.cy = cy - dy;
            });
            moved = true;
        };

        // Zoom at clicked point.
        const pointerUpHandler = event => {
            this.canvas.removeEventListener("pointermove", pointerMoveHandler);
            this.canvas.removeEventListener("pointerup", pointerUpHandler);
            if(!moved){
                // Magnification factor
                let mag = 1.25;

                // Center of canvas in complex plane coordinate system to magnify at the clicked point.
                this.setState(s => {
                    s.cx = cx + (x00 + cx - this.width / 2) * (mag - 1);
                    s.cy = cy + (y00 + cy - this.height / 2) * (mag - 1);
                    s.perPixel /= mag;
                });
                moved = false;
            }
        };

        this.canvas.addEventListener("pointermove", pointerMoveHandler);
        this.canvas.addEventListener("pointerup", pointerUpHandler);
    }
}

async function loadUrlBlobImage(url) {

    let blobBase = `https://scenetellstorage.blob.core.windows.net/primary-container`;
    let endPoint = `${blobBase}/stylesheets${url}`;

    let response = await fetch(endPoint);
    let blob = await response.blob() // Convert the response to a blob object 
    
    // return a promise that resolves with an image object.
    return new Promise((resolve, reject) => {
        
        let image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = URL.createObjectURL(blob); // Create an img element and set its src to the blob URL.         
        
        image.width = 100;
        image.height = 100;
        image.style.position = "fixed";
        image.style.top = "0";
        image.style.left = "0";
        document.body.appendChild(image);

        image.onload = () => resolve(image);
        image.onerror = () => reject(`Image at ${url} could not be loaded.`);
    });
}

function rend (){
    let canvas = document.createElement("canvas");
    document.body.prepend(canvas);
    document.body.style = "margin: 0";

    // CSS pixel size is: 1/96 of an inch.
    canvas.style.width = screen.width;
    canvas.style.height = screen.height;
    canvas.style.border = "1px solid black";
            
    const scale = window.devicePixelRatio;

    // Hardware pixel sizes
    canvas.width = Math.floor(screen.width * scale / 2);
    canvas.height = Math.floor(screen.height * scale / 2);

    loadUrlBlobImage('/images/coconut-tree.png');
    new mandelbrotCanvas(canvas);
}

rend();