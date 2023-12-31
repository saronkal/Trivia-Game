const numberOfQuestions = 10;  // number of questions per quiz
const numberOfOtherQuotes = 3;  // number of other (non-Kanye) quotes per question
const quoteCharacterCap = 80;  // maximum number of characters any quote can have (for presentation)

var currentQuestion = 0;  // keeps track of which question number the player is on
let answeredQuestion = false;  // keeps track of if user answered question already
let score = 0;  // keeps track of amount of questions answered correctly

var questionLoadInterval;
const waitForQuestionLoadTime = 100;  // number of milliseconds to wait before checking if quotes are loaded

var otherQuotes = [];  // contains the normal quotes that will be used in the quiz
var kanyeQuotes = [];  // contains the Kanye West quotes that will be used in the quiz


class Quote {
    constructor(text, author) {
        this.text = text;
        this.author = author;
    }
}


// hides a given element, removing it from document outline
function hideElement(element) {
    $(element).addClass('hide');
}


// shows a given element that was removed from rendering in document outline
function showElement(element) {
    $(element).removeClass('hide');
}


// returns a random integer from 0 to max
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}


// returns true if a quote is NOT already in given array
function quoteNotIncluded(quoteChecked, quotesArray) {
    if (quotesArray.length === 0) { return true; }

    return quotesArray.find(quote => quote.text === quoteChecked) === undefined;
}


// filter out quotes that exceed character maximum, also given an array of quotes to not include
function filterQuotes(quotes, dontIncludeArray) {
    const filteredQuotes = [];

    for (const quote of quotes) {
        if (quote.quoteText.length <= quoteCharacterCap && quoteNotIncluded(quote.quoteText, dontIncludeArray)) {
            const quoteObject = new Quote(quote.quoteText, quote.quoteAuthor);
            filteredQuotes.push(quoteObject);
        }
    }

    return filteredQuotes;
}


// filters a single quote given a Quote and array of quotes to not include
function filterQuote(quote, dontIncludeArray) {
    return filterQuotes([{
        quoteText: quote.text,
        quoteAuthor: quote.author
    }], dontIncludeArray);
}


// fetches all non-Kanye quotes needed for an entire quiz
function fetchOtherQuotes() {
    const count = 10;
    fetch(`https://quote-garden.onrender.com/api/v3/quotes/random?count=${count}`)
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            otherQuotes = otherQuotes.concat(filterQuotes(data.data, otherQuotes));

            // fetch more quotes if there aren't enough to fill all questions
            if (otherQuotes.length < numberOfOtherQuotes * (numberOfQuestions - currentQuestion)) { fetchOtherQuotes(); }
        });
}


// fetches all Kanye quotes needed for an entire quiz
function fetchKanyeQuotes() {
    fetch('https://api.kanye.rest')
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            var quote = data.quote;

            // add punctuation to end of quote so it fits in better
            const endsWithPunctuation = quote.endsWith('.') || quote.endsWith('!') || quote.endsWith('?');
            if (!endsWithPunctuation) { quote = quote + "."; }

            // make quote object and add it to Kanye quotes array
            const quoteObject = new Quote(quote, 'Kanye West');
            kanyeQuotes = kanyeQuotes.concat(filterQuote(quoteObject, kanyeQuotes));

            // fetch more quotes if there aren't enough to fill all questions
            if (kanyeQuotes.length < numberOfQuestions - currentQuestion) { fetchKanyeQuotes(); }
        });
}


// returns the user's highscore saved in local storage
function getHighscore() {
    const storageHighscore = localStorage.getItem("highscore");

    if (storageHighscore) { return Number(storageHighscore); }
    else { return 0; }
}


// updates the highscore in local storage and returns true if a new highscore was reached
function newHighscore() {
    const newHighscore = score > getHighscore();
    localStorage.setItem("highscore", Math.max(score, getHighscore()));
    return newHighscore;
}


// returns an array of all quotes saved in local storage
function getSavedQuotes() {
    const savedQuotesFromStorage = localStorage.getItem("savedQuotes");

    // if any saved quotes were found
    if (savedQuotesFromStorage) { return JSON.parse(savedQuotesFromStorage); }
    else { return []; }
}


// saves a quote to local storage
function saveQuoteToStorage(quoteObject) {
    const savedQuotes = getSavedQuotes();

    // cancel action if quote is already in saved quotes
    if (savedQuotes.find(quote => quote.text === quoteObject.text)) { return; }

    savedQuotes.push(quoteObject);
    localStorage.setItem('savedQuotes', JSON.stringify(savedQuotes));
}


// removes a quote to local storage
function removeQuoteFromStorage(quoteObject) {
    const savedQuotes = getSavedQuotes();

    // cancel action if quote is NOT in saved quotes
    const foundQuoteIndex = savedQuotes.findIndex(quote => quote.text === quoteObject.text);
    if (foundQuoteIndex === -1) { return; }

    savedQuotes.splice(foundQuoteIndex, 1);
    localStorage.setItem('savedQuotes', JSON.stringify(savedQuotes));
}


// handles when a "save quote" button is clicked
function handleSaveQuoteButtonClick(event) {
    event.stopPropagation();

    const button = $(this);
    const quoteObject = JSON.parse(button.data('quote'));

    if (button.attr('data-toggled') === 'true') {
        button.attr('data-toggled', 'false');
        removeQuoteFromStorage(quoteObject);
    }

    else {
        button.attr('data-toggled', 'true');
        saveQuoteToStorage(quoteObject);
    }
}


// changes the kanye head's image and animation depending on given emotion
function kanyeEmotion(emotion) {
    $('.kanye-head').css('background-image', `url("./assets/images/kanye-west-head-${emotion}.png")`);
    if (emotion === 'neutral') { $('.kanye-head').css('animation-name', 'none'); }
    else { $('.kanye-head').css('animation-name', emotion); }
}


function displayCorrectAnswer(quoteCardClicked) {
    score++;
   $('#score').text(score);
    quoteCardClicked.addClass('correct-answer');
    kanyeEmotion('happy');
}


function displayIncorrectAnswer(quoteCardClicked) {
    $('#score').text(score);
    quoteCardClicked.addClass('incorrect-answer');
    kanyeEmotion('upset');
}

// handles when a quote card is click
function handleQuoteCardClick(event) {
    // cancel action if question was already answered
    if (answeredQuestion) { return; }
    answeredQuestion = true;

    // remove hover effect from cards
    $('.quote-card').map(function() {
        $(this).removeClass('hoverable');
    });

    // show the author of each quote
    const quoteCard = $(this);
    const quote = JSON.parse(quoteCard.data('quote'));
    $('.author-text').map(function() {
        const specificQuoteCard = $(this).parents('.quote-card');
        const author = JSON.parse(specificQuoteCard.data('quote')).author;
        $(this).text(author);
    });

    // show next button
    $('.next-btn').css('visibility', 'inherit');

    if (quote.author === 'Kanye West') { displayCorrectAnswer(quoteCard); }
    else { displayIncorrectAnswer(quoteCard); }
}


function endGame() {
    const scoreMessage = $('#currentscore .message');
    scoreMessage.empty();

    hideElement($('#game-section'));
    hideElement($('#loading-section'));
    updateLoadingBar(0);

    const highscoreMessage = $('<p class="highscore-message"></p>');
    if (newHighscore()) { highscoreMessage.text('New Highscore!'); }
    else { highscoreMessage.text(`Highscore: ${getHighscore()}`); }
    scoreMessage.append(highscoreMessage);

    const heading = $('<h2 style="margin-top: 2rem">');
    const subheading = $('<h3 class="center-align subtitle">');
    const imageContainer = $('<div class="image-container">');

    const s = (score !== 1) ? "s" : "";

    // perfect score
    if (score === numberOfQuestions) {
        heading.text(`Perfection. You scored all ${score} points.`);
        subheading.text(`You've come close to my level.`);
        imageContainer.css('background-image', 'url("./assets/images/kanye-perfect-points.jpeg")');
    }

    // 70% correct
    else if (score >= numberOfQuestions * 0.7) {
        heading.text(`You scored ${score} points!`);
        subheading.text(`Kanye is impressed!`);
        imageContainer.css('background-image', 'url("./assets/images/kanye-high-points.png")');
    }

    // Above 0
    else if (score > 0) {
        heading.text(`You scored ${score} point${s}.`);
        subheading.text("I'm a robot. You cannot offend a robot.");
        imageContainer.css('background-image', 'url("./assets/images/kanye-low-points.jpg")');
    }

    // 0
    else {
        heading.text(`Your score is ${score}...`);
        subheading.text(`How could you not know me and not want to be me?`);
        imageContainer.css('background-image', 'url("./assets/images/kanye-zero-points.jpg")');
    }

    scoreMessage.append(heading, subheading, imageContainer);

    showElement($('#currentscore'));
    showElement($('body > footer'));
}


// updates progress bar display based on a given percent
function updateProgressBar(percent) {
    percent = Math.min(percent, 100);  // max number percent can be is 100

    $("#progress-bar").attr('aria-valuenow', percent);
    $("#progress-bar").css('width', percent + '%');
    $('#progress-bar .kanye-head').css('left', 'calc(100% - 25px)');
}


// returns an array of a new question set, removing used quotes from their respective arrays
function generateQuestionSetArray() {
    // get and delete a random Kanye quote
    const kanyeQuoteIndex = getRandomInt(kanyeQuotes.length);
    const kanyeQuote = kanyeQuotes[kanyeQuoteIndex];
    kanyeQuotes.splice(kanyeQuoteIndex, 1);

    // add Kanye quote to question set array
    const questionSet = [kanyeQuote];

    // get and delete a few other quotes
    for (var i = 0; i < numberOfOtherQuotes; i++) {
        const otherQuoteIndex = getRandomInt(otherQuotes.length);
        const otherQuote = otherQuotes[otherQuoteIndex];
        otherQuotes.splice(otherQuoteIndex, 1);

        questionSet.push(otherQuote);
    }

    // scramble question set array
    const scrambledQuestionSet = [];
    while (questionSet.length > 0) {
        const randomIndex = getRandomInt(questionSet.length);
        const randomQuote = questionSet[randomIndex];
        questionSet.splice(randomIndex, 1);

        scrambledQuestionSet.push(randomQuote);
    }

    return scrambledQuestionSet;
}


// generates a question set in the DOM
function generateQuestionSet(questionSet) {
    for (quote of questionSet) {
        // create quote card
        const quoteCard = $(`
        <div class="card quote-card hoverable">
            <div class="card-content">
                <p class="quote-text">${quote.text}</p>
                <div class="row">
                    <div class="author-container col s9">
                        <p class="author-text" data-author="">???</p>
                    </div>
                </div>
            </div>
        </div>`);
        quoteCard.data('quote', JSON.stringify(quote));
        quoteCard.on('click', handleQuoteCardClick);

        // set author in quote
        quoteCard.find('.author-text').attr('data-author', quote.author);

        // create save quote button
        const saveQuoteButton = $(`
        <button class="save-quote-btn" data-toggled="false">
            <i class="small material-icons"></i>
        </button>`);
        saveQuoteButton.data('quote', JSON.stringify(quote));
        saveQuoteButton.on('click', handleSaveQuoteButtonClick);

        quoteCard.find('.row').append(saveQuoteButton);
        $('#game-section main').append(quoteCard);
    }
}


// updates loading bar display based on amount of quotes loaded
function updateLoadingBar(forcePercent=undefined) {
    let percent = forcePercent;

    if (!forcePercent) {
        // calculate percent
        const maxValue = numberOfOtherQuotes + 1;
        const currentValue = Math.min(kanyeQuotes.length, 1) + Math.min(otherQuotes.length, numberOfOtherQuotes);
        percent = Math.round(currentValue / maxValue * 100);
    }

    // update display
    const loadingBar = $('#loading-section .determinate');
    loadingBar.attr('aria-valuenow', String(percent));
    loadingBar.css('width', `${percent}%`);
}


// attempts to generate a new question set
function startNewQuestion() {
    kanyeEmotion('neutral');

    // check if last question is finished
    if (currentQuestion >= numberOfQuestions) {
        endGame();
        return;
    }

    answeredQuestion = false;

    // if enough quotes are loaded for 1 new question
    const enoughQuotesLoaded = (kanyeQuotes.length >= 1) && (otherQuotes.length >= numberOfOtherQuotes);

    if (enoughQuotesLoaded) {
        // stop waiting for loading
        if (questionLoadInterval) {
            clearInterval(questionLoadInterval);
            questionLoadInterval = null;
        }

        // clear out any old quote cards
        $('#game-section main').empty();

        // generate a new question set
        const questionSet = generateQuestionSetArray();
        generateQuestionSet(questionSet);

        hideElement($('#loading-section'));
        $('.next-btn').css('visibility', 'hidden');
        showElement($('#game-section'));

        currentQuestion++;
        updateProgressBar(Math.round(currentQuestion / numberOfQuestions * 100));
    }

    // if more time is needed to load quotes and waiting has not begun
    else if (!questionLoadInterval) {
        // begin rechecking if quotes are loaded on interval
        beginFetchingQuotes();
        questionLoadInterval = setInterval(startNewQuestion, waitForQuestionLoadTime);
    }

    else { updateLoadingBar(); }
}


// begins a new game
function startGame() {
    currentQuestion = 0;
    score = 0;

    hideElement($('#homepage'));
    hideElement($('#currentscore'));
    hideElement($('body > footer'));
    showElement($('#loading-section'));
    startNewQuestion();

}

// begins fetching quotes from APIs
function beginFetchingQuotes() {
    fetchOtherQuotes();
    fetchKanyeQuotes();
}


// generates the quotes from local storage inside the modal
function displaySavedQuotes() {
    const containerElement = $('#saved-quotes .saved-quotes-container');
    containerElement.empty();

    if (getSavedQuotes().length === 0) {
        containerElement.append(`<p class="center-align">You haven't saved any quotes.</p>`);
        return;
    }

    for (let quote of getSavedQuotes()) {
        const quoteElement = $('<div class="saved-quote">');
        quoteElement.append(`
            <blockquote class="left-align">
                ${quote.text}<br/> - ${quote.author}
            </blockquote>`);

        const deleteButton = $(`
            <button class="delete-quote-btn">
                <i class="material-icons">clear</i>
            </button>`);
        deleteButton.on('click', () => {
            removeQuoteFromStorage(quote);
            displaySavedQuotes();
        });

        quoteElement.append(deleteButton);
        containerElement.append(quoteElement);
    }
}


// executed one time once page loads
function init() {
    beginFetchingQuotes();

    $(document).ready(() => { $('.modal').modal(); });

    $('#play-button').on("click", startGame);
    $('.saved-quotes-btn').on("click", displaySavedQuotes);
    $('.next-btn').on('click', startNewQuestion);
    $('#play-again').on("click", startGame);

    updateProgressBar(0);
}


$(init);
