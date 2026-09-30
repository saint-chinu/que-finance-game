import {sqliteTable,text,integer,index,uniqueIndex} from 'drizzle-orm/sqlite-core';
export const runs=sqliteTable('verified_runs',{
 id:text('id').primaryKey(),actor:text('actor').notNull(),scenario:text('scenario').notNull(),engine:text('engine').notNull(),seed:integer('seed').notNull(),revision:integer('revision').notNull().default(0),state:text('state').notNull(),lastHash:text('last_hash'),created:integer('created').notNull(),updated:integer('updated').notNull()
},t=>[index('runs_actor_created').on(t.actor,t.created)]);
export const operations=sqliteTable('verified_operations',{
 id:integer('id').primaryKey({autoIncrement:true}),runId:text('run_id').notNull().references(()=>runs.id),revision:integer('revision').notNull(),operation:text('operation').notNull(),hash:text('hash').notNull()
},t=>[uniqueIndex('operations_run_revision').on(t.runId,t.revision)]);
export const rankings=sqliteTable('rankings',{
 id:text('id').primaryKey(),actor:text('actor').notNull(),scenario:text('scenario').notNull(),name:text('name').notNull(),score:integer('score').notNull(),profitability:integer('profitability').notNull(),health:integer('health').notNull(),wealth:integer('wealth').notNull(),snapshot:text('snapshot').notNull(),created:integer('created').notNull()
},t=>[uniqueIndex('rankings_actor_scenario').on(t.actor,t.scenario),index('rankings_scenario_score').on(t.scenario,t.score,t.created)]);
