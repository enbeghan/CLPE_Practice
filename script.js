const LETTERS=["A","B","C","D","E","F","G"];
let ALL_QUESTIONS=[];
let set=[], i=0, score=0, scored=0, states=[], quizStarted=false;

const $=id=>document.getElementById(id);
const subject=$("subject"), topic=$("topic"), order=$("order"),
badges=$("badges"), prog=$("prog"), scoreEl=$("score"), bar=$("bar"),
meta=$("meta"), questionEl=$("question"), answers=$("answers"),
feedback=$("feedback"), prev=$("prev"), next=$("next"), reset=$("reset"),
quiz=$("quiz"), finish=$("finish"), final=$("final"),
questionNav=$("questionNav"), navSummary=$("navSummary"),
toggleNav=$("toggleNav"), navWrap=$("navWrap");

function track(name,params={}){
  if(typeof gtag==="function") gtag("event",name,params);
}

function context(){
  return {
    quiz_part:"Part One Syllabus Practice No-Repeat",
    practice_subject:subject.value,
    practice_topic:topic.value,
    question_order:order.value,
    total_questions:set.length
  };
}

function esc(s){
  return String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function shuffle(a){
  const b=a.slice();
  for(let x=b.length-1;x>0;x--){
    const j=Math.floor(Math.random()*(x+1));
    [b[x],b[j]]=[b[j],b[x]];
  }
  return b;
}

function initSubjects(){
  const subjects=[...new Set(ALL_QUESTIONS.map(x=>x.subject))];

  subject.innerHTML=`<option value="ALL">All subjects (${ALL_QUESTIONS.length})</option>`;
  for(const s of subjects){
    const n=ALL_QUESTIONS.filter(x=>x.subject===s).length;
    subject.insertAdjacentHTML("beforeend",`<option value="${esc(s)}">${esc(s)} (${n})</option>`);
  }

  subject.disabled=false;
  topic.disabled=false;
  refreshTopics();
}

function refreshTopics(){
  const base=subject.value==="ALL"
    ?ALL_QUESTIONS
    :ALL_QUESTIONS.filter(x=>x.subject===subject.value);

  const topics=[...new Set(base.map(x=>x.section))];
  topic.innerHTML=`<option value="ALL">All topics (${base.length})</option>`;

  for(const t of topics){
    const n=base.filter(x=>x.section===t).length;
    topic.insertAdjacentHTML("beforeend",`<option value="${esc(t)}">${esc(t)} (${n})</option>`);
  }

  build();
}

function build(){
  const base=ALL_QUESTIONS.filter(x=>
    (subject.value==="ALL" || x.subject===subject.value) &&
    (topic.value==="ALL" || x.section===topic.value)
  );

  set=order.value==="shuffle" ? shuffle(base) : base.slice();

  i=0;
  score=0;
  scored=0;
  states=set.map(()=>null);
  quizStarted=false;

  quiz.hidden=false;
  finish.hidden=true;

  badges.innerHTML=
    `<span class="badge">${set.length} questions</span>`+
    `<span class="badge">No repeated question concepts</span>`+
    `<span class="badge">Syllabus practice</span>`;

  renderNav();
  render();
}

function renderNav(){
  questionNav.innerHTML="";
  const frag=document.createDocumentFragment();

  set.forEach((x,idx)=>{
    const b=document.createElement("button");
    b.type="button";
    b.className="nav-question";
    b.textContent=idx+1;

    const navState=
      states[idx]?.ok===true ? "Correct" :
      states[idx]?.ok===false ? "Wrong" :
      "Not answered";

    b.title=`Question ${idx+1} • ${x.subject} • ${x.section} • ${navState}`;

    b.addEventListener("click",()=>{
      const from=i+1;
      i=idx;

      track("practice_question_navigated",{
        ...context(),
        from_question:from,
        to_question:idx+1,
        target_result:
          states[idx]?.ok===true ? "correct" :
          states[idx]?.ok===false ? "incorrect" :
          "unanswered"
      });

      render();
    });

    frag.appendChild(b);
  });

  questionNav.appendChild(frag);
  updateNav();
}

function updateNav(){
  const buttons=questionNav.querySelectorAll(".nav-question");

  buttons.forEach((b,idx)=>{
    b.className="nav-question";

    if(idx===i){
      b.classList.add("current");
    }else if(states[idx]?.ok===true){
      b.classList.add("correct");
    }else if(states[idx]?.ok===false){
      b.classList.add("wrong");
    }
  });

  navSummary.textContent=`${states.filter(Boolean).length} of ${set.length} answered`;
}

function render(){
  if(!set.length){
    prog.textContent="Question 0 of 0";
    scoreEl.textContent="Score: 0 / 0";
    questionEl.textContent="No questions in this selection.";
    answers.innerHTML="";
    feedback.hidden=true;
    next.disabled=true;
    prev.disabled=true;
    reset.disabled=true;
    return;
  }

  const x=set[i];
  const st=states[i];

  prog.textContent=`Question ${i+1} of ${set.length}`;
  scoreEl.textContent=`Score: ${score} / ${scored}`;
  bar.style.width=`${((i+1)/set.length)*100}%`;

  meta.textContent=`${x.subject} • ${x.section} • Unique syllabus practice`;
  questionEl.textContent=x.q;

  answers.innerHTML="";
  feedback.hidden=true;
  feedback.innerHTML="";

  x.options.forEach((opt,j)=>{
    const b=document.createElement("button");
    b.type="button";
    b.className="answer";
    b.textContent=`${LETTERS[j]}. ${opt}`;

    if(st){
      b.disabled=true;
      if(j===x.answer) b.classList.add("correct");
      if(j===st.choice && j!==x.answer) b.classList.add("wrong");
    }

    b.addEventListener("click",()=>choose(j));
    answers.appendChild(b);
  });

  if(st) showFeedback(x,st);

  prev.disabled=i===0;
  next.disabled=false;
  reset.disabled=!st;
  next.textContent=i===set.length-1 ? "Finish" : "Next";

  updateNav();
}

function choose(choice){
  if(states[i]) return;

  const x=set[i];

  if(!quizStarted){
    quizStarted=true;
    track("practice_quiz_started",context());
  }

  const ok=choice===x.answer;
  states[i]={choice,ok};

  scored++;
  if(ok) score++;

  track("practice_question_answered",{
    ...context(),
    question_id:String(x.id),
    question_number:i+1,
    question_subject:x.subject,
    question_topic:x.section,
    answer_result:ok ? "correct" : "incorrect"
  });

  render();
}

function showFeedback(x,st){
  feedback.hidden=false;

  const ans=x.options[x.answer];
  const head=st.ok
    ?`<strong class="good">✓ Correct.</strong>`
    :`<strong class="bad">✗ Incorrect.</strong>`;

  feedback.innerHTML=
    `${head}<br>`+
    `<strong>Verified answer: ${LETTERS[x.answer]}. ${esc(ans)}</strong>`+
    `<div class="teaching">`+
      `<strong>Why this answer is correct:</strong>`+
      `<p>${esc(x.explanation)}</p>`+
    `</div>`+
    `<span class="ref">Part One syllabus, p. ${x.syllabus_page}</span>`;
}

reset.addEventListener("click",()=>{
  const x=set[i];
  const st=states[i];

  if(!st) return;

  if(st.ok){
    score=Math.max(0,score-1);
  }
  scored=Math.max(0,scored-1);

  track("practice_question_reset",{
    ...context(),
    question_id:String(x.id),
    question_number:i+1,
    question_subject:x.subject,
    question_topic:x.section,
    previous_result:st.ok ? "correct" : "incorrect"
  });

  states[i]=null;
  render();

  const firstAnswer=answers.querySelector(".answer");
  if(firstAnswer) firstAnswer.focus();
});

prev.addEventListener("click",()=>{
  if(i>0){
    i--;
    render();
  }
});

next.addEventListener("click",()=>{
  if(i<set.length-1){
    i++;
    render();
  }else{
    const pct=scored ? Number(((score/scored)*100).toFixed(1)) : 0;

    track("practice_quiz_completed",{
      ...context(),
      quiz_score:score,
      scored_questions:scored,
      quiz_percentage:pct
    });

    quiz.hidden=true;
    finish.hidden=false;
    final.textContent=`You scored ${score} out of ${scored} questions (${pct}%).`;
  }
});

subject.addEventListener("change",()=>{
  track("practice_subject_selected",{selected_subject:subject.value});
  refreshTopics();
});

topic.addEventListener("change",()=>{
  track("practice_topic_selected",{
    selected_subject:subject.value,
    selected_topic:topic.value
  });
  build();
});

order.addEventListener("change",()=>{
  track("practice_order_changed",{selected_order:order.value});
  build();
});

toggleNav.addEventListener("click",()=>{
  navWrap.hidden=!navWrap.hidden;
  toggleNav.textContent=navWrap.hidden ? "Show" : "Hide";
});

async function loadQuestionBank(){
  try{
    const response=await fetch("./question-bank-250-unique.json",{cache:"no-store"});

    if(!response.ok){
      throw new Error(`Question bank request failed (${response.status})`);
    }

    const data=await response.json();

    if(!Array.isArray(data) || data.length!==250){
      throw new Error("The question bank did not contain the expected 250 unique questions.");
    }

    ALL_QUESTIONS=data;

    track("practice_question_bank_loaded",{
      quiz_part:"Part One Syllabus Practice No-Repeat",
      question_count:ALL_QUESTIONS.length
    });

    initSubjects();

  }catch(err){
    console.error(err);

    badges.innerHTML=`<span class="badge">Question bank failed to load</span>`;
    meta.textContent="Unable to load the Part One no-repeat question bank.";
    questionEl.innerHTML=
      `<span class="bad">Please make sure <strong>question-bank-250-unique.json</strong> is in the same GitHub folder as this page, then refresh.</span>`;

    navSummary.textContent="Question bank unavailable";

    track("practice_data_load_failed",{
      quiz_part:"Part One Syllabus Practice No-Repeat",
      error_message:String(err?.message || err)
    });
  }
}

loadQuestionBank();
