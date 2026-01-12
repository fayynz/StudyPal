/**
 * StudyPal Application Logic
 */

const app = {
    data: {
        user: { name: "", avatar: "assets/charA.png" },
        schedule: [],
        tasks: [],
        settings: {}
    },
    
    // Character assets map
    characters: [
        "assets/charA.png",
        "assets/charB.png",
        "assets/charC.png"
    ],
    currentCharIndex: 0,
    // --- Character Dialogs ---
characterDialogs: {
    bunny: {
        idle: [
            "Hi! Let’s take today step by step.",
            "It’s okay to stop and rest.",
            "Let’s focus again, you’ve got this."
        ],
        urgent: [
            "Hey… this task needs attention today."
        ],
        break: [
            "Break time! Take a deep breath."
        ],
        stop: [
            "It’s okay to stop and rest."
        ],
        done: "You did great! I’m proud of you."
    },

    pingu: {
        idle: [
            "Hey! Ready to get things done?",
            "Let’s focus again!"
        ],
        urgent: [
            "Uh-oh, this task is almost due!"
        ],
        break: [
            "Break time! Stretch a little!"
        ],
        stop: [
            "Alright, let’s stop here."
        ],
        done: "Yay! Task completed!"
    },

    foxy: {
        idle: [
            "Hey. Let’s plan your day.",
            "Focus time again."
        ],
        urgent: [
            "This deadline is very close."
        ],
        break: [
            "Break time. Clear your mind."
        ],
        stop: [
            "Stopping now is a smart choice."
        ],
        done: "Well done. Nice progress."
    }
},

showConfirm: function(message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-message').textContent = message;

    modal.classList.remove('hidden');

    const yesBtn = document.getElementById('confirm-yes');
    const noBtn = document.getElementById('confirm-no');

    const cleanup = () => {
        modal.classList.add('hidden');
        yesBtn.onclick = null;
        noBtn.onclick = null;
    };

    yesBtn.onclick = () => {
        cleanup();
        onConfirm();
    };

    noBtn.onclick = cleanup;
},

// Pomodoro Cycle
currentMode: 'focus',      // focus | short | long
focusCount: 0,             // hitung focus selesai
setModeByType: function(type) {
    this.currentMode = type;

    let minutes = 25;
    if (type === 'short') minutes = 5;
    if (type === 'long') minutes = 15;

    // update active button UI
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.mode-btn[data-time="${minutes}"]`).classList.add('active');

    this.timeLeft = minutes * 60;
    this.updateTimerDisplay();
},

    pendingAction: null,

    // Pomodoro Timer
    timer: null,
    timeLeft: 25 * 60,
    isTimerRunning: false,

    init: function() {
        this.loadData();
        this.bindEvents();
        this.checkOnboarding();
        this.renderSchedule();
        this.renderTasks();
        this.setupCharacterWidget();
    },

    loadData: function() {
        const storedUser = localStorage.getItem('studyPal_user');
        const storedSchedule = localStorage.getItem('studyPal_schedule');
        const storedTasks = localStorage.getItem('studyPal_tasks');

        if (storedUser) {
            this.data.user = JSON.parse(storedUser);
            // Fallback for missing avatar (legacy data fix)
            if (!this.data.user.avatar) {
                this.data.user.avatar = "assets/charA.png";
                this.saveData();
            }
        }
        if (storedSchedule) this.data.schedule = JSON.parse(storedSchedule);
        if (storedTasks) this.data.tasks = JSON.parse(storedTasks);
    },

    saveData: function() {
        localStorage.setItem('studyPal_user', JSON.stringify(this.data.user));
        localStorage.setItem('studyPal_schedule', JSON.stringify(this.data.schedule));
        localStorage.setItem('studyPal_tasks', JSON.stringify(this.data.tasks));
    },
    getCurrentCharacterKey: function () {
    const avatar = this.data.user.avatar;

    if (avatar.includes('charA')) return 'bunny';
    if (avatar.includes('charB')) return 'pingu';
    if (avatar.includes('charC')) return 'foxy';

    return 'bunny'; // default fallback
},

    bindEvents: function() {
        // Navigation / Sidebar
        // Navigation / Sidebar
        const toggleBtn = document.getElementById('main-toggle-btn');
        const sidebar = document.querySelector('.pixel-sidebar');
        toggleBtn.addEventListener('click', () => {
             const isCollapsed = sidebar.classList.toggle('collapsed');
             document.body.classList.toggle('sidebar-hidden');
             
             // Update logic for mobile/active state if needed
             if(window.innerWidth <= 768) {
                 sidebar.classList.toggle('active-mobile', !isCollapsed);
             }
             
             // Update Icon
             toggleBtn.textContent = isCollapsed ? '☰' : 'X';
        });

        // Close sidebar on outside click (mobile)
        document.addEventListener('click', (e) => {
            if(window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && e.target !== toggleBtn && sidebar.classList.contains('active-mobile')) {
                    sidebar.classList.remove('active-mobile');
                    // Sync desktop state just in case? 
                    // No, mobile active state is separate visual overlay usually
                }
            }
        });

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.target.dataset.target;
                this.switchView(targetId);
                // Update active state
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Close mobile sidebar on nav click
                if(window.innerWidth <= 768) {
                     document.querySelector('.pixel-sidebar').classList.remove('active-mobile');
                }
            });
        });

        // Onboarding
        document.getElementById('prev-char').addEventListener('click', () => this.rotateChar(-1));
        document.getElementById('next-char').addEventListener('click', () => this.rotateChar(1));
        document.getElementById('start-btn').addEventListener('click', () => this.finishOnboarding());

        // Schedule
        document.getElementById('add-schedule-btn').addEventListener('click', () => this.addScheduleItem());
        document.getElementById('reset-schedule-btn').addEventListener('click', () => {
    this.showConfirm("Reset schedule?", () => {
        this.data.schedule = [];
        this.saveData();
        this.renderSchedule();
        this.showModal("Schedule cleared!");
    });
});

        // Tasks
        document.getElementById('add-task-btn').addEventListener('click', () => this.addTask());
        document.getElementById('reset-row-btn').addEventListener('click', () => {
    this.showConfirm("Clear all completed quests?", () => {
        this.clearCompletedTasks();
        this.showModal("Completed quests cleared!");
    });
});

        // Pomodoro
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setTimerMode(e.target));
        });
        document.getElementById('timer-toggle-btn').addEventListener('click', () => this.toggleTimer());
        document.getElementById('reset-timer').addEventListener('click', () => {
    this.showConfirm("Reset pomodoro timer?", () => {
        this.resetTimer();
        this.showModal("Pomodoro reset!");
    });
});

        // Reset All
        document.getElementById('reset-all-btn').addEventListener('click', () => {
    this.showConfirm(
        "Reset EVERYTHING?\nAll progress will be lost!",
        () => {
            localStorage.clear();
            location.reload();
        }
    );
});
        
        // Modal
document.getElementById('modal-ok-btn').addEventListener('click', () => {
    if (this.pendingAction) {
        this.pendingAction();
        this.pendingAction = null;
    }
    this.closeModal();
});

document.getElementById('modal-cancel-btn').addEventListener('click', () => {
    this.pendingAction = null;
    this.closeModal();
});

    },

    checkOnboarding: function() {
        if (!localStorage.getItem('studyPal_user')) {
             document.getElementById('onboarding-section').classList.remove('hidden');
             document.getElementById('main-app').classList.add('hidden');
        } else {
             document.getElementById('onboarding-section').classList.add('hidden');
             document.getElementById('main-app').classList.remove('hidden');
             this.initAppView();
        }
    },

    // --- Onboarding Logic ---
    rotateChar: function(direction) {
        this.currentCharIndex += direction;
        if (this.currentCharIndex < 0) this.currentCharIndex = this.characters.length - 1;
        if (this.currentCharIndex >= this.characters.length) this.currentCharIndex = 0;
        document.getElementById('char-preview').src = this.characters[this.currentCharIndex];
    },

    finishOnboarding: function() {
        const name = document.getElementById('username').value.trim();
        if (!name) {
    this.showModal("Please enter your name!");
    return;

        }
        this.data.user.name = name;
        this.data.user.avatar = this.characters[this.currentCharIndex];
        this.saveData();
        
        document.getElementById('onboarding-section').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        this.initAppView();
    },

    initAppView: function() {
        document.getElementById('welcome-msg').textContent = `WELCOME, ${this.data.user.name}!`;
        document.getElementById('widget-char-img').src = this.data.user.avatar;
        this.characterSpeak(`Let's do this, ${this.data.user.name}!`);
        setInterval(() => this.updateTaskCountdowns(), 60000); // Update every minute
        this.updateTaskCountdowns();
    },

    switchView: function(viewId) {
        document.querySelectorAll('.view').forEach(v => {
            v.classList.remove('active-view');
            v.classList.add('hidden-view');
        });
        const target = document.getElementById(viewId);
        target.classList.remove('hidden-view');
        target.classList.add('active-view');
    },

    // --- Schedule Logic ---
    addScheduleItem: function() {
        const subj = document.getElementById('sched-subject').value;
        const day = document.getElementById('sched-day').value;
        const time = document.getElementById('sched-time').value;

        if (!subj || !day || !time) {
            this.showModal("Please fill all fields!");
            return;
        }

        this.data.schedule.push({ id: Date.now(), subject: subj, day: day, time: time });
        this.saveData();
        this.renderSchedule();
        
        // Reset inputs
        document.getElementById('sched-subject').value = '';
        document.getElementById('sched-time').value = '';
    },

    renderSchedule: function() {
        const tbody = document.getElementById('schedule-list');
        tbody.innerHTML = '';
        
        // Sort by Day then Time (simplistic sort)
        const dayOrder = { "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6, "Sun": 7 };
        this.data.schedule.sort((a, b) => {
            if (dayOrder[a.day] !== dayOrder[b.day]) return dayOrder[a.day] - dayOrder[b.day];
            return a.time.localeCompare(b.time);
        });

        this.data.schedule.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.subject}</td>
                <td>${item.day}</td>
                <td>${item.time}</td>
                <td><button class="pixel-btn small-btn danger-btn" onclick="app.removeSchedule(${item.id})">X</button></td>
            `;
            tbody.appendChild(tr);
        });
    },

    removeSchedule: function(id) {
        this.data.schedule = this.data.schedule.filter(item => item.id !== id);
        this.saveData();
        this.renderSchedule();
    },

    // --- Task / Quest Logic ---
    addTask: function() {
        const desc = document.getElementById('task-desc').value;
        const date = document.getElementById('task-date').value;
        const time = document.getElementById('task-time').value;

        if (!desc || !date) {
            this.showModal("Quest description and date are required!");
            return;
        }

        this.data.tasks.push({
            id: Date.now(),
            desc: desc,
            due: `${date}T${time || '23:59'}`,
            completed: false
        });
        
        this.saveData();
        this.renderTasks();
        this.characterSpeak("New Quest Accepted!");
        
        document.getElementById('task-desc').value = '';
        document.getElementById('task-date').value = '';
        document.getElementById('task-time').value = '';
    },

    renderTasks: function() {
        const container = document.getElementById('task-list-container');
        container.innerHTML = '';

        this.data.tasks.forEach(task => {
            const div = document.createElement('div');
            div.className = `task-item ${task.completed ? 'completed' : ''}`;
            
            const timeLeft = this.calculateTimeLeft(task.due);
            // Check urgency for validation/modal logic requested
            // If less than 1 day and not completed, maybe highlight? 
            
            div.innerHTML = `
                <div style="display:flex; align-items:center; flex-grow:1;">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onchange="app.toggleTask(${task.id})">
                    <span>${task.desc}</span>
                </div>
                <span class="countdown">${task.completed ? 'DONE' : timeLeft}</span>
            `;
            container.appendChild(div);
        });
    },

    calculateTimeLeft: function(dueStr) {
        const now = new Date();
        const due = new Date(dueStr);
        const diff = due - now;

        if (diff <= 0) return "Overdue!";
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        // Logic for alert if <= 1 day? (Handled in dedicated check or just display)
        return `${days}d ${hours}h left`;
    },

    toggleTask: function(id) {
        const task = this.data.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveData();
            this.renderTasks();
            if (task.completed) {
                // REWARD: Chat bubble instead of modal
                this.characterSpeak('done');
            }
        }
    },

    clearCompletedTasks: function() {
        this.data.tasks = this.data.tasks.filter(t => !t.completed);
        this.saveData();
        this.renderTasks();
    },
    
    updateTaskCountdowns: function() {
        // Refresh UI only
        this.renderTasks(); 
        // Also check for urgent tasks to warn user
        const now = new Date();
        const urgent = this.data.tasks.some(t => {
            if(t.completed) return false;
            const due = new Date(t.due);
            const diff = due - now;
            return diff > 0 && diff < (24 * 60 * 60 * 1000); // Less than 24h
        });
        
        if (urgent && Math.random() > 0.7) {
    this.characterSpeak('urgent');
}
    },

    // --- Pomodoro Logic ---
setTimerMode: function(btn) {
    if (this.isTimerRunning) return;

    const mins = parseInt(btn.dataset.time);

    if (mins === 25) this.currentMode = 'focus';
    if (mins === 5) this.currentMode = 'short';
    if (mins === 15) this.currentMode = 'long';

    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    this.timeLeft = mins * 60;
    this.updateTimerDisplay();
},

    toggleTimer: function() {
        const toggleBtn = document.getElementById('timer-toggle-btn');
        
        if (this.isTimerRunning) {
            // Pause
            this.characterSpeak('stop');
            clearInterval(this.timer);
            this.isTimerRunning = false;
            // "pause switch to continue"
            toggleBtn.textContent = 'CONTINUE'; 
            toggleBtn.classList.remove('danger-btn'); // optional styling
        } else {
            // Start or Continue
            this.timer = setInterval(() => {
                this.timeLeft--;
                this.updateTimerDisplay();
                if (this.timeLeft <= 0) {
                    this.timerFinished();
                }
            }, 1000);
            this.isTimerRunning = true;
            // "continue switch to pause"
            toggleBtn.textContent = 'PAUSE';
        }
    },

    resetTimer: function() {
        clearInterval(this.timer);
        this.isTimerRunning = false;
        
        // Find active mode
        const activeBtn = document.querySelector('.mode-btn.active');
        const mins = parseInt(activeBtn.dataset.time);
        this.timeLeft = mins * 60;
        this.updateTimerDisplay();
        
        // Reset button to START
        const toggleBtn = document.getElementById('timer-toggle-btn');
        toggleBtn.textContent = 'START';
        this.currentMode = 'focus';
this.focusCount = 0;

    },

    updateTimerDisplay: function() {
        const m = Math.floor(this.timeLeft / 60);
        const s = this.timeLeft % 60;
        document.getElementById('timer-display').textContent = 
            `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    },

    timerFinished: function() {
    clearInterval(this.timer);
    this.isTimerRunning = false;

    const toggleBtn = document.getElementById('timer-toggle-btn');
    toggleBtn.textContent = 'START';

    // === AUTO CYCLE LOGIC ===
    if (this.currentMode === 'focus') {
        this.focusCount++;

        if (this.focusCount >= 4) {
            // 4x focus → long break
            this.characterSpeak('break');
            this.showModal("Great work! Long break time 🌴");
            this.setModeByType('long');
            this.focusCount = 0; // reset loop
        } else {
            // focus → short break
            this.characterSpeak('break');
            this.showModal("Focus done! Take a short break ☕");
            this.setModeByType('short');
        }

    } else if (this.currentMode === 'short') {
        // short break → focus
        this.characterSpeak('idle');
        this.showModal("Break over! Back to focus 🎯");
        this.setModeByType('focus');

    } else if (this.currentMode === 'long') {
        // long break → focus
        this.characterSpeak('idle');
        this.showModal("Long break finished! New cycle starts 💪");
        this.setModeByType('focus');
    }
},

    // --- Widget & Interactions ---
    characterSpeak: function(type = 'idle') {
    const bubble = document.getElementById('speech-bubble');
    const charKey = this.getCurrentCharacterKey();
    const dialogs = this.characterDialogs[charKey];

    let text = '';

    if (typeof dialogs[type] === 'string') {
        text = dialogs[type];
    } else if (Array.isArray(dialogs[type])) {
        text = dialogs[type][Math.floor(Math.random() * dialogs[type].length)];
    } else {
        text = "Let's study!";
    }

    bubble.textContent = text;
    bubble.classList.remove('hidden');
    bubble.style.animation = 'none';
    bubble.offsetHeight;
    bubble.style.animation = 'popIn 0.3s';

    clearTimeout(this.bubbleTimeout);
    this.bubbleTimeout = setTimeout(() => {
        bubble.classList.add('hidden');
    }, 5000);
},

    
    setupCharacterWidget: function() {
        const widget = document.getElementById('character-widget');
        const charImg = document.getElementById('widget-char-img');
        
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        // Click to speak
        charImg.addEventListener('click', (e) => {
            if (!isDragging) {
                this.characterSpeak('idle');
            }
        });

        // Drag functionality
        charImg.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        // Touch support for mobile
        charImg.addEventListener('touchstart', dragStart);
        document.addEventListener('touchmove', drag);
        document.addEventListener('touchend', dragEnd);

        function dragStart(e) {
            if (e.type === "touchstart") {
                initialX = e.touches[0].clientX - xOffset;
                initialY = e.touches[0].clientY - yOffset;
            } else {
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;
            }

            if (e.target === charImg) {
                isDragging = true;
                charImg.style.cursor = 'grabbing';
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                
                if (e.type === "touchmove") {
                    currentX = e.touches[0].clientX - initialX;
                    currentY = e.touches[0].clientY - initialY;
                } else {
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                }

                xOffset = currentX;
                yOffset = currentY;

                setTranslate(currentX, currentY, widget);
            }
        }

        function dragEnd(e) {
            if (isDragging) {
                initialX = currentX;
                initialY = currentY;
                isDragging = false;
                charImg.style.cursor = 'pointer';
            }
        }

        function setTranslate(xPos, yPos, el) {
            el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
        }
    },

    showModal: function(msg) {
        document.getElementById('modal-message').textContent = msg;
        document.getElementById('custom-modal').classList.remove('hidden');
    },

    closeModal: function() {
        document.getElementById('custom-modal').classList.add('hidden');
    }
};

// Initialize
app.init();
