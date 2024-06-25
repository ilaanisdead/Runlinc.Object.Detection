const words = [
    { word: 'Apple', example: 'An apple a day keeps the doctor away.' },
    { word: 'Banana', example: 'Monkeys love to eat bananas.' },
    { word: 'Cat', example: 'The cat chased the mouse.' },
    { word: 'Dog', example: 'The dog barked all night.' },
    { word: 'Elephant', example: 'The elephant is the largest land animal.' },
    { word: 'Orange', example: 'Oranges are a good source of vitamin C.' },
    { word: 'Giraffe', example: 'Giraffes have long necks to reach high leaves.' },
    { word: 'House', example: 'The house was built in the 19th century.' },
    { word: 'Car', example: 'The car sped down the highway.' },
    { word: 'Tree', example: 'The tree provides shade during the summer.' },
    { word: 'Flower', example: 'The flower bloomed beautifully in the garden.' },
    { word: 'Bird', example: 'The bird sang a melodious tune.' },
    { word: 'River', example: 'The river flowed gently through the valley.' },
    { word: 'Mountain', example: 'The mountain peak was covered in snow.' },
    { word: 'Book', example: 'The book was filled with fascinating stories.' },
    { word: 'Chair', example: 'The chair was very comfortable to sit on.' },
    { word: 'Computer', example: 'The computer was running the latest software.' },
    { word: 'Sun', example: 'The sun rose early in the morning.' },
    { word: 'Moon', example: 'The moon shone brightly in the night sky.' },
    { word: 'Star', example: 'The star twinkled in the dark sky.' }
];


let currentWord = words[0];
let predictedWord = currentWord.word; // Initialize with the first word

const flashcard = document.getElementById('flashcard');
const result = document.getElementById('result');
const speakButton = document.getElementById('speakButton');
const randomizeButton = document.getElementById('randomizeButton');
const describeButton = document.getElementById('describeButton');
const helpButton = document.getElementById('helpButton');
const startVideoButton = document.getElementById('startVideoButton');
const stopVideoButton = document.getElementById('stopVideoButton');
const startPredictingButton = document.getElementById('startPredictingButton');
const video = document.getElementById('video');
const videoCanvas = document.getElementById('videoCanvas');
const videoContainer = document.getElementById('video-container');
const helpText = document.getElementById('helpText');
let mobilenet;
let label = '';
let confidence = 0;
let predicting = false;
let predictionCounts = {};
let predictionLimit = 10;
let predictionHistory = [];

// Display the initial word (without example)
flashcard.innerText = currentWord.word;
result.innerText = ''; // Clear previous results

// Randomize word
randomizeButton.addEventListener('click', () => {
    const randomIndex = Math.floor(Math.random() * words.length);
    currentWord = words[randomIndex];
    predictedWord = currentWord.word; // Update the predictedWord to the new random word
    flashcard.innerText = currentWord.word;
    result.innerText = ''; // Clear previous results
});

// Speak word
speakButton.addEventListener('click', () => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.start();

    recognition.onresult = (event) => {
        const speechResult = event.results[0][0].transcript.toLowerCase();
        if (speechResult === currentWord.word.toLowerCase()) {
            result.innerText = `Correct! You said: ${speechResult}`;
        } else {
            result.innerText = `Incorrect. You said: ${speechResult}`;
        }
    };

    recognition.onspeechend = () => {
        recognition.stop();
    };

    recognition.onerror = (event) => {
        result.innerText = `Error occurred in recognition: ${event.error}`;
    };
});

// Toggle help text
helpButton.addEventListener('click', () => {
    if (helpText.style.display === 'none') {
        helpText.style.display = 'block';
    } else {
        helpText.style.display = 'none';
    }
});

// Describe word
describeButton.addEventListener('click', () => {
    if (words.some(wordObj => wordObj.word === predictedWord)) {
        // If the word is in the array, use its example
        const wordObj = words.find(wordObj => wordObj.word === predictedWord);
        result.innerText = `${predictedWord}: ${wordObj.example}`;
        const synth = window.speechSynthesis;
        const utterThis = new SpeechSynthesisUtterance(`${predictedWord}. ${wordObj.example}`);
        synth.speak(utterThis);
    } else {
        // If the word is not in the array, fetch from the API
        fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${predictedWord}`)
            .then(response => response.json())
            .then(data => {
                let exampleSentence = '';
                if (data && data.length > 0 && data[0].meanings && data[0].meanings.length > 0) {
                    for (let meaning of data[0].meanings) {
                        if (meaning.definitions && meaning.definitions.length > 0 && meaning.definitions[0].example) {
                            exampleSentence = meaning.definitions[0].example;
                            break;
                        }
                    }
                }
                if (exampleSentence) {
                    const synth = window.speechSynthesis;
                    const utterThis = new SpeechSynthesisUtterance(`${predictedWord}. ${exampleSentence}`);
                    synth.speak(utterThis);
                    result.innerText = `${predictedWord}: ${exampleSentence}`;
                } else {
                    // Speak the word even if no example is found
                    const synth = window.speechSynthesis;
                    const utterThis = new SpeechSynthesisUtterance(`${predictedWord}`);
                    synth.speak(utterThis);
                    result.innerText = `${predictedWord}`;
                }
            })
            .catch(error => {
                console.error('Error fetching example:', error);
                // Speak the word even if an error occurs
                const synth = window.speechSynthesis;
                const utterThis = new SpeechSynthesisUtterance(`${predictedWord}`);
                synth.speak(utterThis);
                result.innerText = `${predictedWord}`;
            });
    }
});

// Start video
startVideoButton.addEventListener('click', () => {
    videoContainer.style.display = 'flex';
    startVideoButton.style.display = 'none';
    stopVideoButton.style.display = 'inline';
    startPredictingButton.style.display = 'inline';
    setupVideo(); // Initialize video setup
});

// Stop video
stopVideoButton.addEventListener('click', () => {
    videoContainer.style.display = 'none';
    startVideoButton.style.display = 'inline';
    stopVideoButton.style.display = 'none';
    startPredictingButton.style.display = 'none';
    video.srcObject.getTracks().forEach(track => track.stop());
});

// Setup video
function setupVideo() {
    video.srcObject = null;
    video.width = 640;
    video.height = 480;
    videoCanvas.width = 640;
    videoCanvas.height = 480;
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
            video.play();
            mobilenet = ml5.imageClassifier('MobileNet', video, modelReady);
            drawVideoStream(); // Start drawing video stream
            updateFlashcardCanvas(currentWord.word); // Update flashcard canvas initially
        });
}

// Function to draw video stream continuously
function drawVideoStream() {
    const context = videoCanvas.getContext('2d');
    function draw() {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            context.drawImage(video, 0, 0, videoCanvas.width, videoCanvas.height);
            context.fillStyle = 'white';
            context.font = '32px Arial';
            context.fillText(`${label} ${confidence.toFixed(2)}`, 10, videoCanvas.height - 20);
        }
        requestAnimationFrame(draw);
    }
    draw();
}

// When the model is ready
function modelReady() {
    console.log('Model is ready!!!');
}

// Start predicting
startPredictingButton.addEventListener('click', () => {
    if (!predicting) {
        predicting = true;
        resetPredictionHistory();
        mobilenet.predict(gotResults);
    }
});

// Function to handle the results from the prediction
function gotResults(error, results) {
    if (error) {
        console.error(error);
    } else {
        let currentPrediction = results[0].className;
        let currentConfidence = results[0].probability;

        predictionHistory.push(currentPrediction);

        // Count occurrences of each prediction
        if (predictionCounts[currentPrediction]) {
            predictionCounts[currentPrediction]++;
        } else {
            predictionCounts[currentPrediction] = 1;
        }

        // If we've collected enough predictions, determine the most common one
        if (predictionHistory.length >= predictionLimit) {
            let mostCommonPrediction = getMostCommonPrediction();
            let predictedObject = mostCommonPrediction.label.split(',')[0]; // Take the first word of the prediction
            predictedWord = predictedObject; // Update the predictedWord variable
            flashcard.innerText = predictedWord;
            confidence = mostCommonPrediction.count / predictionLimit;
            predicting = false;
            resetPredictionHistory();
        } else {
            mobilenet.predict(gotResults);
        }

        // Display the current prediction on the video
        label = currentPrediction.split(',')[0]; // Take the first word of the prediction
        confidence = currentConfidence;
    }
}

// Function to determine the most common prediction
function getMostCommonPrediction() {
    let mostCommon = { label: '', count: 0 };
    for (let prediction in predictionCounts) {
        if (predictionCounts[prediction] > mostCommon.count) {
            mostCommon.label = prediction;
            mostCommon.count = predictionCounts[prediction];
        }
    }
    return mostCommon;
}

// Function to reset prediction history and counts
function resetPredictionHistory() {
    predictionHistory = [];
    predictionCounts = {};
}

// Function to draw the flashcard text on the flashcard container
function updateFlashcardCanvas(word) {
    flashcard.innerText = word; // Update flashcard text
}
