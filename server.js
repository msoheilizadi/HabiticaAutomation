import readline from 'readline';
import axios from 'axios';
import dotenv from 'dotenv';
import { updateAchieveHour } from './notionAPI.js';

dotenv.config();

const API_USER = process.env.HABITICA_USER;
const API_TOKEN = process.env.HABITICA_TOKEN;

const difficultyMap = {
  1: 0.1,  // Trivial
  2: 1,    // Easy
  3: 1.5,  // Medium
  4: 2     // Hard
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function parseDate(input) {
  const [day, month] = input.split('/').map(Number);
  const now = new Date();
  const year = now.getFullYear();
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  return date.toISOString();
}

function getRandomDifficulty() {
  return Math.floor(Math.random() * 4) + 1;
}

function createTasks(){
    rl.question('Enter task name: ', (taskName) => {
    rl.question('Enter difficulty list (space-separated numbers 1-4 or "random"): ', (diffInput) => {
        let difficulties;
        let useRandom = false;

        if (diffInput.trim().toLowerCase() === 'random') {
        useRandom = true;
        } else {
        difficulties = diffInput.trim().split(/\s+/).map(Number);
        if (difficulties.some(d => ![1, 2, 3, 4].includes(d))) {
            console.log('❌ Invalid difficulty number(s). Use only 1, 2, 3, 4 or "random".');
            rl.close();
            return;
        }
        }

        rl.question('Enter number of tasks: ', (numInput) => {
        const count = parseInt(numInput);
        if (isNaN(count) || count < 1) {
            console.log('❌ Invalid number of tasks.');
            rl.close();
            return;
        }

        rl.question('Enter start date for tasks (DD/MM): ', async (startDateInput) => {
            const startDateISO = parseDate(startDateInput);

            console.log('\n📤 Sending daily tasks to Habitica:\n');

            for (let i = 0; i < count; i++) {
            let diff;
            if (useRandom) {
                diff = getRandomDifficulty();
            } else {
                diff = difficulties[i] || difficulties[difficulties.length - 1];
            }

            const task = {
                type: 'daily',
                text: `${taskName} ${i + 1}`,
                priority: difficultyMap[diff],
                startDate: startDateISO,
                frequency: 'weekly',
                repeat: { m: true, t: true, w: true, th: true, f: true, s: true, su: true }
            };

            console.log(task);
            

            try {
                await axios.post(
                'https://habitica.com/api/v3/tasks/user',
                task,
                {
                    headers: {
                    'x-api-user': API_USER,
                    'x-api-key': API_TOKEN,
                    'Content-Type': 'application/json'
                    }
                }
                );
                console.log(`✅ Created: ${task.text} (difficulty ${diff}) starting on ${startDateInput}`);
            } catch (error) {
                console.error(`❌ Failed to create "${task.text}":`, error.response?.data?.message || error.message);
            }
            }

            rl.close();
        });
        });
    });
    });
}

async function completeTasks() {
  try {
    const res = await axios.get('https://habitica.com/api/v3/tasks/user?type=dailys', {
      headers: {
        'x-api-user': API_USER,
        'x-api-key': API_TOKEN
      }
    });

    const tasks = res.data.data;

    const dueUncompletedTasks = tasks.filter(task => !task.completed && task.isDue);

    if (dueUncompletedTasks.length === 0) {
        console.log('📭 No due and uncompleted daily tasks found.');
        rl.close();
        return;
    }

    console.log('\n📋 Your Due & Uncompleted Daily Tasks:\n');
    dueUncompletedTasks.forEach((task, index) => {
        console.log(`${index}. ${task.text}`);
    });

    rl.question('\nWhich task did you complete? (Enter number or task name): ', async (input) => {
      const index = parseInt(input);
      let selectedTask;

      if (!isNaN(index) && index >= 0 && index <= tasks.length) {
        selectedTask = tasks[index];
      } else {
        selectedTask = tasks.find(task => task.text.toLowerCase() === input.trim().toLowerCase());
      }

      if (!selectedTask) {
        console.log('❌ Task not found.');
        rl.close();
        return;
      }

      const title = selectedTask.text;
      const firstWord = title.split(' ')[0];
      const capitalized =  firstWord[0].toUpperCase() + firstWord.slice(1);
      updateAchieveHour(capitalized, 1);
      

      try {
        await axios.post(
          `https://habitica.com/api/v3/tasks/${selectedTask.id}/score/up`,
          {},
          {
            headers: {
              'x-api-user': API_USER,
              'x-api-key': API_TOKEN,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log(`✅ Marked "${selectedTask.text}" as complete!`);
      } catch (error) {
        console.error('❌ Failed to mark task complete:', error.response?.data?.message || error.message);
      }

      rl.close();
    });
  } catch (error) {
    console.error('❌ Failed to fetch daily tasks:', error.response?.data?.message || error.message);
    rl.close();
  }
}

function getYesterdayDateOnlyISO() {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

async function startNewDay() {
  console.log('\n🔄 Starting a new day...');

  const yesterdayISO = getYesterdayDateOnlyISO();

  try {
    const res = await axios.get('https://habitica.com/api/v3/tasks/user?type=dailys', {
      headers: {
        'x-api-user': API_USER,
        'x-api-key': API_TOKEN
      }
    });

    const tasks = res.data.data;
    let deleted = 0;

    for (const task of tasks) {
      const taskStart = new Date(task.startDate);
      taskStart.setHours(0, 0, 0, 0); // normalize time
      const taskStartISO = taskStart.toISOString();

      if (taskStartISO === yesterdayISO) {
        await axios.delete(`https://habitica.com/api/v3/tasks/${task.id}`, {
          headers: {
            'x-api-user': API_USER,
            'x-api-key': API_TOKEN
          }
        });

        console.log(`🗑️ Deleted: ${task.text}`);
        deleted++;
      }
    }

    if (deleted === 0) {
      console.log('📭 No tasks from yesterday to delete.');
    } else {
      console.log(`✅ Done. Deleted ${deleted} task(s).`);
    }

  } catch (err) {
    console.error('❌ Error while starting a new day:', err.response?.data?.message || err.message);
  }

  rl.close();
}

rl.question('What do you want to do? (create / complete / start): ', (action) => {
  const trimmed = action.trim().toLowerCase();

  if (trimmed === 'create') {
    createTasks();
  } else if (trimmed === 'complete') {
    completeTasks();
  } else if (trimmed === 'start') {
    startNewDay();
  } else {
    console.log('❌ Invalid input. Please type "create" or "complete".');
    rl.close();
  }
});




