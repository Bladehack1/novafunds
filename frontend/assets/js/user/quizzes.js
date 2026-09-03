// ================================================================
//  NOVAFUNDS — user/quizzes.js
//  Quiz de formation pour les utilisateurs
//  Emplacement : frontend/assets/js/user/quizzes.js
// ================================================================
//
//  FONCTIONNALITÉS :
//   1. Vérification de session
//   2. Chargement de la liste des quiz disponibles
//   3. Démarrage d'un quiz (affichage des questions une par une)
//   4. Soumission des réponses et affichage du score
//   5. Validation et éventuelle récompense
//
// ================================================================

const API_BASE = '/api';

function requireAuth() {
  const token = localStorage.getItem('nf_token');
  const user  = JSON.parse(localStorage.getItem('nf_user') || 'null');
  if (!token || !user) { window.location.href = '../public/login.html'; return null; }
  return { token, user };
}

// Zones d'affichage principales
const quizListSection     = document.getElementById('quiz-list-section');     // Liste des quiz
const quizPlaySection     = document.getElementById('quiz-play-section');     // Lecture du quiz
const quizResultSection   = document.getElementById('quiz-result-section');   // Résultat
const quizListContainer   = document.getElementById('quizzes-container');     // Cartes de quiz
const questionContainer   = document.getElementById('quiz-question-container'); // Questions
const submitQuizBtn       = document.getElementById('quiz-submit-btn');       // Bouton valider
const quizTitleEl         = document.getElementById('quiz-play-title');       // Titre du quiz en cours

// Données du quiz en cours de réponse
let currentQuizId      = null;  // ID du quiz sélectionné
let userAnswers        = {};    // { question_id: answer_value }

// ---------------------------------------------------------------
// CHARGEMENT DE LA LISTE DES QUIZ
// ---------------------------------------------------------------

/**
 * Charge la liste des quiz disponibles depuis l'API.
 * @param {string} token
 */
async function loadQuizzes(token) {
  if (!quizListContainer) return;
  quizListContainer.innerHTML = '<p>Chargement des quiz…</p>';

  try {
    const response = await fetch(`${API_BASE}/user/quizzes`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Impossible de charger les quiz.');

    const quizzes = await response.json();
    renderQuizList(quizzes, token);

  } catch (err) {
    if (quizListContainer) quizListContainer.innerHTML = `<p style="color:red;">${escapeHtml(err.message)}</p>`;
  }
}

// ---------------------------------------------------------------
// AFFICHAGE DE LA LISTE DES QUIZ
// ---------------------------------------------------------------

function renderQuizList(quizzes, token) {
  if (!quizListContainer) return;

  if (!quizzes || quizzes.length === 0) {
    quizListContainer.innerHTML = '<p>Aucun quiz disponible pour le moment.</p>';
    return;
  }

  quizListContainer.innerHTML = '';

  quizzes.forEach(quiz => {
    const card = document.createElement('article');
    const doneLabel = quiz.user_completed ? '✅ Déjà complété' : '▶ Démarrer';

    card.innerHTML = `
      <h3>${escapeHtml(quiz.title)}</h3>
      <p>${escapeHtml(quiz.description ?? '')}</p>
      <p><strong>Questions :</strong> ${quiz.questions_count}</p>
      <p><strong>Récompense :</strong> ${quiz.reward ?? '0'} USD</p>
      <p>
        <button class="btn-start-quiz" data-id="${quiz.id}" ${quiz.user_completed ? 'disabled' : ''}>
          ${doneLabel}
        </button>
      </p>
    `;
    quizListContainer.appendChild(card);
  });

  document.querySelectorAll('.btn-start-quiz').forEach(btn => {
    btn.addEventListener('click', () => {
      startQuiz(btn.dataset.id, token);
    });
  });
}

// ---------------------------------------------------------------
// DÉMARRAGE D'UN QUIZ
// ---------------------------------------------------------------

/**
 * Charge les questions d'un quiz et affiche la section de jeu.
 * @param {string} quizId
 * @param {string} token
 */
async function startQuiz(quizId, token) {
  currentQuizId = quizId;
  userAnswers   = {};

  try {
    const response = await fetch(`${API_BASE}/user/quizzes/${quizId}/questions`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Impossible de charger les questions.');

    const { quiz, questions } = await response.json();

    // Affiche la section quiz et cache la liste
    if (quizListSection)   quizListSection.style.display   = 'none';
    if (quizResultSection) quizResultSection.style.display = 'none';
    if (quizPlaySection)   quizPlaySection.style.display   = 'block';
    if (quizTitleEl)       quizTitleEl.textContent          = quiz.title;

    renderQuestions(questions);

  } catch (err) {
    alert(`Erreur : ${err.message}`);
  }
}

// ---------------------------------------------------------------
// AFFICHAGE DES QUESTIONS
// ---------------------------------------------------------------

function renderQuestions(questions) {
  if (!questionContainer) return;
  questionContainer.innerHTML = '';

  questions.forEach((q, index) => {
    const block = document.createElement('div');
    const optionsHtml = (q.options ?? []).map(opt => `
      <label>
        <input type="radio" name="q_${q.id}" value="${escapeHtml(opt.value)}">
        ${escapeHtml(opt.label)}
      </label><br>
    `).join('');

    block.innerHTML = `
      <p><strong>Question ${index + 1} :</strong> ${escapeHtml(q.text)}</p>
      <div>${optionsHtml}</div>
      <hr>
    `;
    questionContainer.appendChild(block);

    // Écoute les changements de réponse pour les enregistrer
    block.querySelectorAll(`input[name="q_${q.id}"]`).forEach(radio => {
      radio.addEventListener('change', () => {
        userAnswers[q.id] = radio.value;
      });
    });
  });
}

// ---------------------------------------------------------------
// SOUMISSION DES RÉPONSES
// ---------------------------------------------------------------

if (submitQuizBtn) {
  submitQuizBtn.addEventListener('click', async () => {
    const session = requireAuth();
    if (!session) return;

    if (!currentQuizId) return;

    submitQuizBtn.disabled    = true;
    submitQuizBtn.textContent = 'Envoi des réponses…';

    try {
      const response = await fetch(`${API_BASE}/user/quizzes/${currentQuizId}/submit`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.token}` },
        body:    JSON.stringify({ answers: userAnswers }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur.');

      // Affichage du résultat
      if (quizPlaySection)   quizPlaySection.style.display   = 'none';
      if (quizResultSection) quizResultSection.style.display = 'block';

      const resultEl = document.getElementById('quiz-result-text');
      if (resultEl) {
        resultEl.innerHTML = `
          Score : <strong>${data.score} / ${data.total}</strong><br>
          ${data.passed
            ? `<span style="color:green;">🎉 Bravo ! Vous avez réussi. +${data.reward ?? 0} USD crédités.</span>`
            : `<span style="color:red;">😕 Essayez encore. Score minimum requis : ${data.min_score}.</span>`
          }
        `;
      }

    } catch (err) {
      alert(`Erreur : ${err.message}`);
    } finally {
      submitQuizBtn.disabled    = false;
      submitQuizBtn.textContent = 'Valider mes réponses';
    }
  });
}

// ---------------------------------------------------------------
// FONCTIONS UTILITAIRES
// ---------------------------------------------------------------

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---------------------------------------------------------------
// INITIALISATION
// ---------------------------------------------------------------

(function init() {
  const session = requireAuth();
  if (!session) return;
  loadQuizzes(session.token);
})();
