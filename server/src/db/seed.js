import { seedData } from "../../seeds/demoData.js";

function upsert(table, record) {
  const index = table.findIndex((item) => item.id === record.id);
  if (index >= 0) table[index] = { ...table[index], ...record };
  else table.push(record);
}

export async function runSeeds(database, data = seedData) {
  database.ensureTables();
  for (const [tableName, records] of Object.entries(data)) {
    const table = database.table(tableName);
    for (const record of records) upsert(table, record);
  }
  await database.persist();
  return {
    tablesSeeded: Object.keys(data),
    recordCount: Object.values(data).reduce((total, records) => total + records.length, 0),
  };
}
