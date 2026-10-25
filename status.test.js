import test from "node:test";
import assert from "node:assert/strict";
const ids=["scope","review","tests","security","staging","qa","backup","deploy","monitor","announce"];
const status=done=>done.length===0?"planned":done.length===ids.length?"done":"ongoing";
test("no completed steps means planned",()=>assert.equal(status([]),"planned"));
test("some completed steps means ongoing",()=>assert.equal(status(["scope"]),"ongoing"));
test("all ten completed steps means done",()=>assert.equal(status(ids),"done"));
test("step IDs are unique",()=>assert.equal(new Set(ids).size,10));
