document.addEventListener('DOMContentLoaded', () => {

    // --- Arrays for paired messages and GIFs ---
    const congratsFeedback = [
        { message: "Outstanding! A perfect score!", gif: "1.gif" },
        { message: "Flawless victory! You're a genius!", gif: "2.gif" },
        { message: "Amazing! You aced it!", gif: "3.gif" },
        { message: "Incredible! You didn't miss a single one!", gif: "4.gif" },
        { message: "Perfection! You're unstoppable!", gif: "5.gif" },
        { message: "You're on fire! That was brilliant!", gif: "6.gif" },
        { message: "Aced it! Nothing gets past you.", gif: "7.gif" },
        { message: "Top of the class! Excellent work.", gif: "8.gif" },
        { message: "That was a masterclass performance.", gif: "9.gif" },
        { message: "You've got this down to a science.", gif: "10.gif" },
        { message: "Simply spectacular!", gif: "11.gif" },
        { message: "100%! You're a legend!", gif: "12.gif" }
    ];

    const trollFeedback = [
        { message: "Well, that was certainly an attempt.", gif: "1.gif" },
        { message: "Did you try closing your eyes?", gif: "2.gif" },
        { message: "My cat could do better. And she can't read.", gif: "3.gif" },
        { message: "Maybe this just isn't your topic.", gif: "4.gif" },
        { message: "Is 'random guessing' your strategy?", gif: "5.gif" }
    ];

    // --- GRAB HTML & FIREBASE ELEMENTS ---
    const auth = firebase.auth();
    const db = firebase.firestore();

    const authSection = document.getElementById('auth-section');
    const appSection = document.getElementById('app-section');
    const logoutButton = document.getElementById('logout-button');
    const usernameInput = document.getElementById('username-input');
    const passwordInput = document.getElementById('password-input');
    const loginButton = document.getElementById('login-button');
    
    const manageQuizButton = document.getElementById('manage-quiz-button');
    
    const fileInput = document.getElementById('file-input');
    const uploadButton = document.getElementById('upload-button');
    const fileList = document.getElementById('file-list');
    
    const uploadSection = document.getElementById('upload-section');
    const fileListSection = document.getElementById('file-list-section');
    const quizSection = document.getElementById('quiz-section');
    const resultsSection = document.getElementById('results-section');
    const backToHomeButton = document.getElementById('back-to-home-button');
    
    // --- GLOBAL VARIABLES ---
    let currentUser = null;
    let userQuizzes = {};
    let currentQuiz = {};
    let currentQuestionIndex = 0;
    let userAnswers = [];
    let isManageMode = false;

    // --- FIREBASE AUTHENTICATION ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            authSection.classList.add('hidden');
            appSection.classList.remove('hidden');
            logoutButton.classList.remove('hidden');
            renderFileList(); 
        } else {
            currentUser = null;
            authSection.classList.remove('hidden');
            appSection.classList.add('hidden');
            logoutButton.classList.add('hidden');
        }
    });

    loginButton.addEventListener('click', () => {
        const username = usernameInput.value;
        const password = passwordInput.value;
        const email = username.toLowerCase() + '@quizapp.local';
        auth.signInWithEmailAndPassword(email, password)
            .catch(error => alert("Incorrect username or password."));
    });

    logoutButton.addEventListener('click', () => auth.signOut());

    // --- UI EVENT LISTENERS ---
    manageQuizButton.addEventListener('click', () => {
        isManageMode = !isManageMode;
        uploadSection.classList.toggle('hidden', !isManageMode);
        fileListSection.classList.toggle('manage-mode', isManageMode);
        manageQuizButton.textContent = isManageMode ? 'Done Managing' : 'Manage Quizzes';
    });

    uploadButton.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const quizData = parseQuizText(e.target.result);
            if (quizData && quizData.questions.length > 0) {
                await saveQuizToFirestore(quizData);
                await renderFileList(); 
            } else { 
                alert("Upload failed. Please check file format."); 
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    });

    fileList.addEventListener('click', async (event) => {
        const quizId = event.target.dataset.quizId;
        if (event.target.classList.contains('start-button')) {
            startQuiz(quizId);
        }
        if (event.target.classList.contains('delete-button')) {
            if (confirm("Are you sure you want to delete this quiz?")) {
                await deleteQuizFromFirestore(quizId);
                await renderFileList(); 
            }
        }
    });
    
    backToHomeButton.addEventListener('click', () => {
        resultsSection.classList.add('hidden');
        document.getElementById('manage-controls').classList.remove('hidden');
        fileListSection.classList.remove('hidden');

        isManageMode = false;
        uploadSection.classList.add('hidden');
        fileListSection.classList.remove('manage-mode');
        manageQuizButton.textContent = 'Manage Quizzes';
    });

    // --- FIREBASE QUIZ FUNCTIONS ---
    async function saveQuizToFirestore(quizData) {
        if (!currentUser) return;
        try {
            quizData.ownerId = currentUser.uid;
            await db.collection('quizzes').add(quizData);
        } catch (error) { console.error("Error saving quiz: ", error); }
    }
    async function getQuizzesFromFirestore() {
        if (!currentUser) return {};
        const quizzes = {};
        try {
            const querySnapshot = await db.collection('quizzes').where("ownerId", "==", currentUser.uid).get();
            querySnapshot.forEach((doc) => {
                quizzes[doc.id] = doc.data();
            });
        } catch (error) { console.error("Error fetching quizzes: ", error); }
        return quizzes;
    }
    async function deleteQuizFromFirestore(quizId) {
        if (!currentUser) return;
        try {
            await db.collection('quizzes').doc(quizId).delete();
        } catch (error) { console.error("Error deleting quiz: ", error); }
    }

    // --- UI RENDERING ---
    async function renderFileList() {
        userQuizzes = await getQuizzesFromFirestore();
        fileList.innerHTML = '';
        if (Object.keys(userQuizzes).length === 0) {
            fileList.innerHTML = '<p>You have not uploaded any quizzes yet.</p>';
            return;
        }
        for (const id in userQuizzes) {
            const quiz = userQuizzes[id];
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `<span>${quiz.title}</span><div><button class="start-button" data-quiz-id="${id}">Start</button><button class="delete-button" data-quiz-id="${id}">Delete</button></div>`;
            fileList.appendChild(item);
        }
    }

    // --- QUIZ LOGIC ---
    function startQuiz(quizId) {
        const fullQuizData = userQuizzes[quizId];
        currentQuiz = {
            title: fullQuizData.title,
            questions: []
        };
        let processedQuestions = shuffleArray(fullQuizData.questions);
        if (processedQuestions.length > 10) {
            processedQuestions = processedQuestions.slice(0, 10);
        }
        currentQuiz.questions = processedQuestions;
        currentQuestionIndex = 0;
        userAnswers = [];
        
        appSection.querySelectorAll('section:not(#quiz-section)').forEach(sec => sec.classList.add('hidden'));
        quizSection.classList.remove('hidden');
        
        displayQuestion();
    }
    function displayQuestion() {
        const question = currentQuiz.questions[currentQuestionIndex];
        document.getElementById('quiz-title').textContent = currentQuiz.title;
        document.getElementById('question-text').textContent = question.questionText;
        const optionsContainer = document.getElementById('options-container');
        optionsContainer.innerHTML = '';
        const shuffledOptions = shuffleArray(question.options);
        shuffledOptions.forEach(option => {
            const button = document.createElement('button');
            button.className = 'option-button';
            button.textContent = option;
            button.onclick = () => selectAnswer(option, button);
            optionsContainer.appendChild(button);
        });
    }
    function selectAnswer(selectedOption, clickedButton) {
        document.querySelectorAll('.option-button').forEach(btn => btn.disabled = true);
        const question = currentQuiz.questions[currentQuestionIndex];
        const correctAnswer = question.correctAnswerText;
        userAnswers[currentQuestionIndex] = selectedOption;
        if (selectedOption === correctAnswer) {
            clickedButton.classList.add('correct');
        } else {
            clickedButton.classList.add('incorrect');
            document.querySelectorAll('.option-button').forEach(btn => {
                if (btn.textContent === correctAnswer) btn.classList.add('correct');
            });
        }
        setTimeout(() => {
            currentQuestionIndex++;
            if (currentQuestionIndex < currentQuiz.questions.length) {
                displayQuestion();
            } else {
                showResults();
            }
        }, 1500);
    }
    
    function showResults() {
        quizSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');

        const oldFeedback = resultsSection.querySelector('.feedback-message');
        if (oldFeedback) {
            oldFeedback.remove();
        }
        
        const reviewContainer = document.getElementById('review-container');
        reviewContainer.innerHTML = '';
        let finalScore = 0;
        const totalQuestions = currentQuiz.questions.length;
        currentQuiz.questions.forEach((question, index) => {
            const userAnswer = userAnswers[index];
            const isCorrect = userAnswer === question.correctAnswerText;
            if (isCorrect) finalScore++;
            const item = document.createElement('div');
            item.className = 'review-item';
            let reviewHTML = `<p class="review-question">${index + 1}. ${question.questionText}</p>`;
            reviewHTML += `<p class="user-answer ${isCorrect ? 'correct' : 'incorrect'}">Your answer: ${userAnswer}</p>`;
            if (!isCorrect) {
                reviewHTML += `<p class="correct-answer-text">Correct answer: ${question.correctAnswerText}</p>`;
                item.style.borderLeftColor = '#dc3545';
            } else {
                item.style.borderLeftColor = '#28a745';
            }
            item.innerHTML = reviewHTML;
            reviewContainer.appendChild(item);
        });
        document.getElementById('score').textContent = finalScore;
        document.getElementById('total-questions').textContent = totalQuestions;
        
        if (finalScore === totalQuestions && totalQuestions > 0) {
            const feedback = congratsFeedback[Math.floor(Math.random() * congratsFeedback.length)];
            const gifPath = `icons/congrats/${feedback.gif}`;
            displayFeedbackMessage(feedback.message, gifPath, '#28a745');
        } 
        else if (finalScore < 5 && totalQuestions > 0) {
            const feedback = trollFeedback[Math.floor(Math.random() * trollFeedback.length)];
            const gifPath = `icons/troll/${feedback.gif}`;
            displayFeedbackMessage(feedback.message, gifPath, '#dc3545');
        }
    }

    function displayFeedbackMessage(message, gifPath, color) {
        const feedbackContainer = document.createElement('div');
        feedbackContainer.className = 'feedback-message';
        feedbackContainer.style.textAlign = 'center';
        feedbackContainer.style.margin = '20px 0';
        const messageText = document.createElement('p');
        messageText.style.fontSize = '1.2em';
        messageText.style.fontWeight = 'bold';
        messageText.style.color = color;
        messageText.textContent = message;
        const feedbackImage = document.createElement('img');
        feedbackImage.src = gifPath;
        feedbackImage.alt = 'Feedback GIF';
        feedbackImage.style.width = '100px';
        feedbackImage.style.height = '100px';
        feedbackImage.style.marginTop = '10px';
        feedbackContainer.appendChild(messageText);
        feedbackContainer.appendChild(feedbackImage);
        const reviewContainer = document.getElementById('review-container');
        resultsSection.insertBefore(feedbackContainer, reviewContainer);
    }
    
    // --- HELPER FUNCTIONS ---
    function shuffleArray(array) {
        const shuffled = array.slice();
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    function parseQuizText(text) {
        try {
            const sections = text.split('---').map(s => s.trim()).filter(s => s);
            const title = sections[0].replace('Title:', '').trim();
            const questions = sections.slice(1).map(qText => {
                const lines = qText.split(/\r?\n/).filter(line => line.trim() !== '');
                if (lines.length < 3) return null;
                const questionText = lines[0];
                const options = lines.slice(1, -1);
                const answerLine = lines[lines.length - 1];
                if (!answerLine.toLowerCase().startsWith('answer:')) return null;
                const answerLetter = answerLine.replace(/answer:/i, '').trim().toUpperCase();
                const correctAnswerText = options.find(opt => opt.trim().toUpperCase().startsWith(answerLetter));
                if (!correctAnswerText) return null;
                return { questionText, options, answer: answerLetter, correctAnswerText };
            }).filter(q => q !== null);
            return { title, questions };
        } catch (error) {
            console.error("Error parsing quiz text:", error);
            return null;
        }
    }
});
