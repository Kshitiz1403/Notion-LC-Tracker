require('dotenv').config()
const { Client } = require('@notionhq/client');
const { createEvent } = require('./google');
const notion = new Client({
    auth: process.env.NOTION_TOKEN
});
(async () => {
    const databaseId = '4f2211c6f09e4e558279eac8f553e85b';
    const response = await notion.databases.query({
        database_id: databaseId,
    })
    response.results.forEach(async page => {
        const pageId = page.id;
        const pageObject = await notion.pages.retrieve({ page_id: pageId });
        let dueDate = null;
        let created = new Date(pageObject.properties['Create Time'].created_time)
        created.setTime(created.getTime() + 5 * 60 * 60 * 1000 + 30 * 60 * 1000)
        let days = [getDay(pageObject, '1D', 1), getDay(pageObject, '2D', 2), getDay(pageObject, '7D', 7), getDay(pageObject, '15D', 15), getDay(pageObject, '1M', 1 * 30), getDay(pageObject, '3M', 1 * 30 * 3),]
        console.log(days)
        for (let i = 0; i < days.length; i++) {
            let day = days[i];
            if (!day.isCompleted) {
                dueDate = new Date(created);
                dueDate.setDate(created.getDate() + day.days)
                break;
            }
        }
        let remindDate = new Date(pageObject.properties['Remind'].date && pageObject.properties['Remind'].date.start);
        let isChanged = false;
        if (dueDate > remindDate) {
            remindDate = dueDate;
            isChanged = true
        }
        const today = new Date();
        if (remindDate < today) {
            remindDate = today;
            isChanged = true;
        }
        console.log('created', created)
        console.log('due', dueDate)
        console.log('remind', remindDate)

        console.log(pageObject.url)
        if (isChanged) {
            const summary = pageObject.properties['Problem'].title[0].plain_text
            const description = `${pageObject.properties['Problem'].title[0].href}\n${pageObject.url}`
            console.log(summary, description)
            await createEvent(remindDate, summary, description)
        }

        const pageUpdate = await notion.pages.update({
            page_id: pageId,
            properties: {
                'Remind': {
                    date: {
                        start: remindDate,
                    },
                },
            },
        });
    })
})();

function getDay(pageObject, placeholder, days) {
    return { days: days, isCompleted: pageObject.properties[placeholder]['checkbox'] }
}