require("@langchain/langgraph/zod");
const { z } = require("zod");
const { StateGraph, START, END } = require("@langchain/langgraph");

const MetadataSchema = z.object({
  information: z.any(),
  websites: z.any(),
});

const ChromaInputSchema = z.object({
  docs: z.array(), 
  metadata: MetadataSchema
});



const AgentState = z.object({
});


async function JDAgent(config, state) {

}



const workflow = new StateGraph(AgentState)
  .addNode("JDAgent", JDAgent)
  .addEdge(START, "JDAgent")
  .addEdge("JDAgent", END);


const JDAgentGraph = workflow.compile({
  interruptBefore: [],
  interruptAfter: [],
  debug: true
});



  module.exports = { JDAgentGraph };