import readline from 'readline';
import notifier from 'node-notifier';

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function startTimer (minutes, label) {
  console.log(`⏳ ${label} started for ${minutes} minutes.`);

  for (let i = minutes * 60; i > 0; i--) {
    process.stdout.write(`\r⏰ ${label} - ${Math.floor(i / 60)}m ${i % 60}s remaining`);
    await sleep(1000);
  }

  console.log(`\n✅ ${label} ended!`);
};

async function startPomodoro () {
  while (true) {
    await startTimer(0, 'Focus');
    playSound();
    await startTimer(0, 'Break');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) =>
      rl.question('🍅 Do you want to start another Pomodoro? (y/n): ', resolve)
    );
    rl.close();

    if (answer.toLowerCase() !== 'y') break;
  }

  console.log('🎉 Pomodoro session complete!');
};

function playSound() {
    notifier.notify({
        title: 'Promodoro Timer',
        message: 'Time is up!',
        sound: true
    });
};

startPomodoro();