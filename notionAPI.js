import axios from "axios";
import dotenv from 'dotenv';

dotenv.config();

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_TOKEN = process.env.DB_TOKEN;
const STATS_ID = process.env.STATS_ID;

const NOTION_HEADERS = {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json'
};

export async function updateAchieveHour(goalName, amountToAdd) {
  try {
    const queryRes = await axios.post(
      `https://api.notion.com/v1/databases/${DATABASE_TOKEN}/query`,
      {
        filter: {
          property: 'Goals',
          title: {
            equals: goalName
          }
        }
      },
      { headers: NOTION_HEADERS }
    );

    if (!queryRes.data.results.length) {
      console.log(`❌ No row found with Goals = "${goalName}"`);
      return;
    }

    const page = queryRes.data.results[0];
    const pageId = page.id;
    const statePageId = STATS_ID;

    const currentHour = page.properties['Current achieve hour']?.number || 0;
    const currentHourStats = page.properties['Current achieve hour']?.number || 0;
    const newHour = currentHour + amountToAdd;
    const newHourStats = currentHourStats + amountToAdd;

    await axios.patch(
      `https://api.notion.com/v1/pages/${pageId}`,
      {
        properties: {
          'Current achieve hour': {
            number: newHour
          }
        }
      },
      { headers: NOTION_HEADERS }
    );


    await axios.patch(
      `https://api.notion.com/v1/pages/${statePageId}`,
      {
        properties: {
          'Current achieve hour': {
            number: newHourStats
          }
        }
      },
      { headers: NOTION_HEADERS }
    );

    console.log(`✅ Updated "${goalName}" → ${currentHour} ➝ ${newHour} hours`);
    console.log(`✅ Updated Stats → ${currentHourStats} ➝ ${newHourStats} hours`);
  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
  }
}