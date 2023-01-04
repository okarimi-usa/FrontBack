
window.onerror = function(msg, url, linenum){
//window.addEventListener("error", function(msg, url, linenum){
    window.alert(msg, url, linenum);
};
class Complex {
    constructor(x, y){
         this.x = x;
         this.y = y;
    }
    toString(){
        return `${this.x}${this.y>0?` + ${Math.abs(this.y)}i`:this.y<0?` - ${Math.abs(this.y)}i`:''}`;
    }
    get re(){return this.x;}
    set re(value){this.x = value;}

    get im(){return this.y;}
    set im(value){this.y = value;}

    get magnitude(){return Math.pow(squre(this), 0.5);}
    static add(c1, c2){return [c1.x + c2.x, c1.y + c2.y];}
    static sub(c1, c2){return [c1.x - c2.x, c1.y - c2.y];}
    static mult(c1, c2){return [c1.x * c2.x - c1.y * c2.y, c1.x * c2.y + c1.y * c2.x];}
    static square(c) {return c.x * c.x + c.y * c.y;}
    static div(c1, c2){
        let squares = Math.pow(c1.x, 2) - Math.pow(c2.y, 2);
        return new Complex(Complex.re(c1)/squares, -Complex.im(c1)/squares);
    }
}

// Generator and yield.
function callforBut1(){
    function *zip(...iterables){
       let iterators = iterables.map(i => i[Symbol.iterator]());
       let index = 0;
       while(iterators.length > 0){
         if(index >= iterators.length){
            index = 0;
         }
         let item = iterators[index].next();
         if(item.done){
            iterators.splice(index, 1);
         }
         else{
            yield item.value;
            index++;
         }
       }
    }

    let res = [...zip([100, 101, 102, 123, 124], "123", [8, 9, 10])];
    document.getElementById("results").innerHTML = `<br> ${res}`;
}  

// Object Prototype
function callforBut2(){
    let ob = {};
    let oc = {};

    let od = [];

    let animal = {
        eats: 100,
    };

    let herbivor = {
        food: "grass",
        type: "mammal",
        set settype(value) {this.type = value;},
        get gettype() { return value;}
    };

    function Rabbit(name) {
        this.name = name;
    }

    Rabbit.prototype = herbivor;

    let rabbit = new Rabbit("White Rabbit");

    let rabbit2 = Object.create(herbivor, 
        {
            food : {
                value: "hey",
                writable: false,
                enumerable: true,
                configurable: true,
            },
            type :{
                value: "greenery",
                writable: true,
                enumerable: true,
                configurable: true,
            }
        }
    );

    rabbit2.settype = "rodent";

    document.getElementById("results").innerHTML = `<br>pre element
         displays this in two lines. ${rabbit2.toString()}`;
 } 

 // ImageData
 function callforBut3(){
    let canvas = document.createElement("canvas");
    
    document.body.append(canvas);
    document.body.style = "margin: 0";

    // Apparent size of the canvas. Area occupied by canvas.
    canvas.style.width = "auto";
    canvas.style.height = "auto";
        
    const scale = window.devicePixelRatio; // Change to 1 on retina screens to see blurry canvas.
    canvas.width = Math.floor(document.body.clientWidth);
    canvas.height = Math.floor(window.innerHeight);
 
    //canvas.style.border = "10px solid black";

    let context = canvas.getContext("2d");

    let width = canvas.width;
    let height = canvas.height;

    let pixels = context.getImageData(0, 0, width, height);

    let data = pixels.data;

    const n = 2;
    let m = n - 1;

    for(let row = 0; row < height; row++){
        let i = row * width * 4 + 4;
        for(let col = 1; col < width; col++, i += 4){
            data[i + 0] = (data[i + 0] + 255 * Math.random() * m) / n; // Red
            data[i + 1] = (data[i + 1] + 255 * Math.random() * m) / n; // Green
            data[i + 2] = (data[i + 2] + 255 * Math.random() * m) / n; // Blue
            data[i + 3] = 255;
        }
    }
    
    context.putImageData(pixels, 0, 0);  
}

function callforBut4(){
        
    function not(f){
        return function(...args){
           let result = f(args);
           return !result;
        };
    }

    const even = x => x%2 === 0;
    const odd = not(even);

    let arr = [1, 1, 3, 7, 9];
    let what = arr.every(odd);

    document.querySelector("#results").innerHTML = `<br>t
         ${arr} is all odd: ${what}`;

}  
 
// Closure in action.
function callforBut5(){

    function memoize(f){
       const cache = new Map();

       return function(...args){
          let key = args.length + args.join("+");

          if(cache.has(key)){
              return cache.get(key);
          } else{
            let result = f.apply(this, args);
            cache.set(key, result);
            return result;
          }
       };
    }

    // The greatest common denominator.
    function gcd(a, b){
        if(a < b){
            [a, b] = [b, a];
        }
        while(b !== 0){
           [a, b] = [b, a%b];
        }
        return a;
    }

    // gcdmemo is set to the return function of memoize. Called once.
    const gcdmemo = memoize(gcd);

    // Pass repeated pairs of values to find their gcds.
    let n = Number(prompt("Please input some numbers.", "12"));
    if(n > 1){
        let m = Number(prompt("Please input another numbers.", "12"));

        if(m > 1){
            value = gcdmemo(n, m);

            document.getElementById("results").innerHTML = `<br>pre element
                The greatest common denominator is: ${value}`;
        }
    }
}

// Promise
function callforBut6(){

    function wait(duration){
        return new Promise((resolve, reject) => {
            if(duration < 0){
                reject(new Error("Duration needs to be positive"));
            }
            setTimeout(resolve, duration, Date.now());
        });
    }

    // <then> executes the passed in function and passes the argument by which and when the promise on which it was called, was resolved.  
    wait(2000)
    .then(response => { 
        console.log(`In first then. 
        Previous promise was resolved in ` + (Date.now() - response) + ` milisecond.`);
        return  new Promise((resolve, reject) => {
            setTimeout(resolve, 3000, 7);
        });
    })
    .then(response => {
        console.log(`In second then. 
        Since previous then was resolved by a promise that was resolved with 7, 
        this then is resolved after additional 3000 milisecond wait with response of`, response);
    })
    .then(response => {
        console.log(`In the third then. 
        Previous then returned undefined. So this then response is immediately returned and is:`, response);
    })
    .catch(e => {
        console.log( "Error is: " + e.toString());
    });
}

// Table of Contents.
function callforBut7(){

    let toc = document.querySelector("#TOC");
    if(!toc){
        toc = document.createElement("div");
        toc.id = "TOC";
        document.body.prepend(toc);
    }

    let headings = document.querySelectorAll("h2, h3, h4, h5, h6");
    let sectionNumbers = Array.of(0, 0, 0, 0, 0, 0);

    for(let heading of headings){
        if(heading.parentNode === toc){
            continue;
        }

        let level = Number.parseInt(heading.tagName[1]);

        sectionNumbers[level - 1]++;
        for(let i = level; i < sectionNumbers.length; i++){
            sectionNumbers[i] = 0;
        }

        let sectionNumber = sectionNumbers.slice(0, level).join(".");
        let span = document.createElement("span");
        span.textContent = sectionNumber;
        heading.prepend(span);

        let anchor = document.createElement("a");
        let fragmentName = `TOC${sectionNumber}`;
        anchor.name = fragmentName;
        heading.before(anchor);
        anchor.append(heading);

        let link = document.createElement("a");
        link.href = `#${fragmentName}`;
        link.innerHTML = heading.innerHTML;

        let entry = document.createElement("div");
        entry.classList.add("TOCEntry", `TOCLevel${level}`);
        entry.append(link);
        toc.append(entry);
    }
}





















