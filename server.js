import express from "express";
import { Pool } from "pg";
import { graphql, buildSchema } from "graphql";
import fs from "node:fs";
import path from "node:path";

const app = express();
app.use(express.json());
app.use(express.static("public"));
const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://releases:releases@localhost:5432/releases" });
const steps = [
  ["scope","Confirm scope and release notes"], ["review","Code review approved"],
  ["tests","Automated tests passing"], ["security","Security checks complete"],
  ["staging","Staging deployment verified"], ["qa","QA sign-off received"],
  ["backup","Database backup verified"], ["deploy","Production deployment complete"],
  ["monitor","Monitoring and alerts checked"], ["announce","Release communicated to stakeholders"]
];
const statusOf = done => !done.length ? "planned" : done.length === steps.length ? "done" : "ongoing";
const shape = r => {
  const done = Array.isArray(r.completed_steps) ? r.completed_steps : [];
  return { id:r.id, name:r.name, date:r.release_date.toISOString(), status:statusOf(done),
    additionalInfo:r.additional_info || "", completedSteps:done,
    steps:steps.map(([id,label])=>({id,label,completed:done.includes(id)})),
    createdAt:r.created_at.toISOString(), updatedAt:r.updated_at.toISOString() };
};
const schema = buildSchema(`
  type Step { id: ID!, label: String!, completed: Boolean! }
  type Release { id: ID!, name: String!, date: String!, status: String!, additionalInfo: String!, completedSteps: [String!]!, steps: [Step!]!, createdAt: String!, updatedAt: String! }
  type Query { releases: [Release!]!, releaseSteps: [Step!]! }
  type Mutation {
    createRelease(name: String!, date: String!, additionalInfo: String): Release!
    updateRelease(id: ID!, completedSteps: [String!], additionalInfo: String): Release
    deleteRelease(id: ID!): Boolean!
  }
`);
const root = {
  releases: async () => (await pool.query("SELECT * FROM releases ORDER BY release_date ASC")).rows.map(shape),
  releaseSteps: () => steps.map(([id,label])=>({id,label,completed:false})),
  createRelease: async ({name,date,additionalInfo=""}) => {
    if (!name?.trim()) throw new Error("Release name is required.");
    if (Number.isNaN(Date.parse(date))) throw new Error("A valid release date is required.");
    const r = await pool.query("INSERT INTO releases(name,release_date,additional_info) VALUES($1,$2,$3) RETURNING *", [name.trim(),new Date(date),additionalInfo]);
    return shape(r.rows[0]);
  },
  updateRelease: async ({id,completedSteps,additionalInfo}) => {
    const old = await pool.query("SELECT * FROM releases WHERE id=$1",[id]);
    if (!old.rows.length) throw new Error("Release not found.");
    const row=old.rows[0];
    const done = Array.isArray(completedSteps) ? [...new Set(completedSteps.filter(x=>steps.some(s=>s[0]===x)))] : row.completed_steps;
    const info = typeof additionalInfo === "string" ? additionalInfo : row.additional_info;
    const r=await pool.query("UPDATE releases SET completed_steps=$2::jsonb,additional_info=$3,updated_at=now() WHERE id=$1 RETURNING *",[id,JSON.stringify(done),info]);
    return shape(r.rows[0]);
  },
  deleteRelease: async ({id}) => (await pool.query("DELETE FROM releases WHERE id=$1 RETURNING id",[id])).rowCount > 0
};
app.post("/graphql", async (req,res) => {
  try {
    const result = await graphql({schema,source:req.body?.query || "",rootValue:root,variableValues:req.body?.variables || {}});
    res.status(result.errors ? 400 : 200).json(result);
  } catch(e) { res.status(500).json({errors:[{message:"Request failed"}]}); }
});
app.get("/health", (_req,res)=>res.json({ok:true}));
const port=Number(process.env.PORT || 4000);
app.listen(port,()=>console.log("Release Checklist API listening on "+port));
