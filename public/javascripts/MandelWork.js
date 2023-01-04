
// Tile corner, x0, and y0 are measured in complex plane coordinate system in pixels.
// x, and y are values in complex plane coordinate system. Numeric value corresponding
// to each pixel is "perPixel" in complex plane. Mandelbrot computations are done for
// pixel increaments of perPixel in x, and y directions in complex plane coordinate system. 
onmessage = function(message){
    const {tile, x0, y0, perPixel, maxIterations} = message.data;
    const {width, height} = tile;

    const imageData = new ImageData(width, height);
    const iterations = new Uint32Array(imageData.data.buffer);

    let index = 0, max = 0, min = maxIterations;
    for(let row = 0, y = y0 * perPixel; row < height; row++, y += perPixel){
        for(let column = 0, x = x0 * perPixel; column < width; column++, x += perPixel){
            let n;
            let r = x, i = y;
            for(n = 0; n < maxIterations; n++){
                let rr = r*r, ii = i*i;
                if(rr + ii > 4){
                    break;
                }

                // Z^2 + C
                i = 2*r*i + y;
                r = rr - ii + x;
            }

            iterations[index++] = n;
            if(n > max) max = n;
            if(n < min) min = n;
        }   
    }

    postMessage({tile, imageData, min, max}, [imageData.data.buffer]);
};
