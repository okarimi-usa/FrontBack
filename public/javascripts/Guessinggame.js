
class GameState {
    static newGame() {
        let s = new GameState();
        s.secret = s.randomInt(0, 100);
        s.low = 0;
        s.high = 100;
        s.numGuesses = 0;
        s.guess = null;
        return s;
    }

    static fromStateObject(stateObject){
        let s = new GameState();
        for(let key of Object.keys(stateObject)){
            s[key] = stateObject[key];
        }
        return s;
    }

    toURL() {
        let url = new URL(window.location);
        url.searchParams.set("l", this.low);
        url.searchParams.set("h", this.high);
        url.searchParams.set("n", this.numGuesses);
        url.searchParams.set("g", this.guess);
        return url.href;
    }

    static fromURL(url){
        let s = new GameState();
        let params = new URL(url).searchParams;
        s.low = parseInt(params.get("l"));
        s.high = parseInt(params.get("h"));
        s.numGuesses = parseInt(params.get("n"));
        s.guess = parseInt(params.get("g"));

        if (isNaN(s.low) || isNaN(s.high) || isNaN(s.numGuesses) || isNaN(s.guess)) {
            return null;
        }

        s.secret = s.randomInt(s.low, s.high);
        return s;
    }

    randomInt(min, max){
        return min + Math.ceil(Math.random() * (max - min - 1));
    }

    render(){
        let heading = document.querySelector("#heading");
        let range = document.querySelector("#range");
        let input = document.querySelector("#input");
        let playagain = document.querySelector("#playagain");

        heading.textContent = document.title = `I am thinking of 
                                  a number between ${this.low} and ${this.high}`;
        range.style.marginLeft = `${this.low}%`;
        range.style.width = `${(this.high - this.low)}%`;
        input.value = "";
        input.focus();

        if(this.guess === null){
            input.placeholder = `type your guess and hit Enter`;
        }
        else if (this.guess < this.secret) {
            input.placeholder = `${this.guess} is too low. Guess again`;
        }
        else if (this.guess > this.secret){
            input.placeholder = `${this.guess} is too high. Guess again`;
        }
        else{
            input.placeholder = document.title = `${this.guess} is correct!`;
            heading.textContent = `You win in ${this.numGuesses} gusses!`;
            playagain.style.display = "block";
        }
    }
    
    updateForGuess(guess) {
        if ((guess > this.low) && (guess  < this.high)){
            if(guess < this.secret) this.low = guess;
            else if(guess > this.secret) this.high = guess;
            this.guess = guess;
            this.numGuesses++;
            return true;
        }
        else{
            alert(`Please enter a number greater than ${this.low} and less than ${this.high}`);
            return false;
        }
    }
}

let fromURL = GameState.fromURL(window.location);
let newGame = GameState.newGame();
let gamestate = fromURL || newGame;

history.replaceState(gamestate, "", gamestate.toURL());
gamestate.render();

document.querySelector("#input").onchange = event => {
    if(gamestate.updateForGuess(parseInt(event.target.value))){
        history.pushState(gamestate, "", gamestate.toURL());
    }

    gamestate.render();
};

window.onpopstate = event => {
    gamestate = GameState.fromStateObject(event.state);
    gamestate.render();
};