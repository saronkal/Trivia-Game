const numberOfQuestions = 1;  // number of questions per quiz
const numberOfOtherQuotes = 3;  // number of other (non-Kanye) quotes per question
const quoteCharacterCap = 80;  // maximum number of characters any quote can have (for presentation)

var currentQuestion = 0;  // keeps track of which question number the player is on

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


function hideElement(element) {
    $(element).addClass('hide');
}


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
            // console.log(data);
            otherQuotes = otherQuotes.concat(filterQuotes(data.data, otherQuotes));

            // fetch more quotes if there aren't enough to fill all questions
            if (otherQuotes.length < numberOfOtherQuotes * (numberOfQuestions - currentQuestion)) { 
                fetchOtherQuotes();
            }

            else {
                console.log("Other Quotes:", otherQuotes);
            }
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
            const endsWithPunctuation = quote.endsWith('.') || quote.endsWith('!') || quote.endsWith('!');
            if (!endsWithPunctuation) { quote = quote + "."; }

            // make quote object and add it to Kanye quotes array
            const quoteObject = new Quote(quote, 'Kanye West');
            kanyeQuotes = kanyeQuotes.concat(filterQuote(quoteObject, kanyeQuotes));
            
            
            // fetch more quotes if there aren't enough to fill all questions
            if (kanyeQuotes.length < numberOfQuestions - currentQuestion) {
                fetchKanyeQuotes();
            }

            else {
                console.log("Kanye Quotes:", kanyeQuotes);
            }
        });
}


// returns an array of all quotes saved in local storage
function getSavedQuotes() {
    const savedQuotesFromStorage = localStorage.getItem("savedQuotes");

    // if any saved quotes were found
    if (savedQuotesFromStorage) {
        return JSON.parse(savedQuotesFromStorage);
    }

    else {
        return [];
    }
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
    console.log("Question Set:", questionSet);

    for (quote of questionSet) {
        const quoteCard = $(`
        <div class="card quote-card">
            <div class="card-content">
                <p class="quote-text">${quote.text}</p>
                <div class="row">
                    <div class="author-container col s6">
                        <p class="author-text">???</p>
                    </div>
                </div>
            </div>
        </div>`);

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


function startNewQuestion() {
    // if enough quotes are loaded for 1 new question
    const enoughQuotesLoaded = (kanyeQuotes.length >= 1) && (otherQuotes.length >= numberOfOtherQuotes);
    if (enoughQuotesLoaded) {
        // stop waiting for loading
        if (questionLoadInterval) { 
            clearInterval(questionLoadInterval);
            questionLoadInterval = null;
        }

        // generate a new question set
        const questionSet = generateQuestionSetArray();
        generateQuestionSet(questionSet);
        showElement($('#game-section'));
        currentQuestion++;
    }

    // if more time is needed to load quotes and waiting has not begun
    else if (!questionLoadInterval) {
        // begin rechecking if quotes are loaded on interval
        questionLoadInterval = setInterval(startNewQuestion, waitForQuestionLoadTime);
    }

    else {
        console.log("Wait for load...");
    }
}


// begins a new game
function startGame() {
    currentQuestion = 0;
    startNewQuestion();

    hideElement($('#homepage'));
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

    for (quote of getSavedQuotes()) {
        const quoteElement = $('<blockquote class=".left-align">');
        quoteElement.html(`${quote.text}<br/> - ${quote.author}`);
        containerElement.append(quoteElement);
    }
}


// executed one time once page loads
function init() {
    beginFetchingQuotes();

    hideElement($('#game-section'));

    $(document).ready(function(){
        $('.modal').modal();
      });

    $('#play-button').on("click", startGame);
    $('#saved-quotes-button').on("click", displaySavedQuotes);

    // bookmark icon fills in on hover
    // $('.save-quote-btn').on('mouseover', (event) => { $(event.target).find('.material-icons').text('bookmark'); });
    // bookmark icon outline when not hovering
    // $('.save-quote-btn').on('mouseleave', (event) => { $(event.target).find('.material-icons').text('bookmark_border'); });
    // clicking bookmark button saves the quote
    $('.save-quote-btn .material-icons').on('click', () => { console.log("Save Quote button clicked!"); } );
}


$(init);