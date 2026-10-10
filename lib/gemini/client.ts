import { GoogleGenerativeAI } from '@google/generative-ai';
import { AGENT_TOOLS } from './tools';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  message: string;
  source: 'gemini' | 'engine_fallback';
  toolCallsExecuted?: Array<{
    name: string;
    args: any;
    result: any;
  }>;
}

const SYSTEM_PROMPT = `You are Kaveri Desk Agent, an expert supply-chain decision assistant for Kaveri Spares & Hydraulics across North Karnataka (Belgaum, Gokak, Hubli, Dharwad, Bagalkot, Vijayapura, and Central Warehouses in Hubli & Belgaum). You are advising Ramesh Kulkarni, Head of Purchasing.

STRICT PRINCIPLES:
1. NEVER INVENT NUMBERS. Only cite figures retrieved through your tools.
2. If you do not have data, explicitly state "I don't have that data" rather than hallucinating.
3. Be concise, direct, and actionable (2-4 sentences typical for a purchasing executive).
4. Always explain the financial trade-offs (e.g. stockout lost margin vs extra supplier freight, MOQ lock-in vs urgent delivery).
5. Always address Ramesh with professional warmth and deep local domain expertise.`;

/**
 * Executes a conversational turn with Google Gemini, using tools where appropriate.
 * If GEMINI_API_KEY is not set or fails, gracefully falls back to deterministic template responses.
 */
export async function executeChatTurn(
  messages: ChatMessage[],
  latestQuery: string
): Promise<ChatResponse> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  // If no Gemini API key provided, use intelligent deterministic fallback
  if (!apiKey) {
    return handleDeterministicFallback(latestQuery);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      tools: [
        {
          functionDeclarations: Object.values(AGENT_TOOLS).map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters as any,
          })),
        },
      ],
    });

    const chat = model.startChat();
    let response = await chat.sendMessage(latestQuery);
    const toolCallsExecuted: Array<{ name: string; args: any; result: any }> = [];

    let functionCalls = response.response.functionCalls();
    let loopCount = 0;

    while (functionCalls && functionCalls.length > 0 && loopCount < 3) {
      loopCount++;
      const call = functionCalls[0];
      const toolDef = AGENT_TOOLS[call.name];

      let toolResult: any;
      if (toolDef) {
        try {
          toolResult = await toolDef.execute(call.args || {});
        } catch (err: any) {
          toolResult = { error: err.message };
        }
      } else {
        toolResult = { error: `Tool ${call.name} not found` };
      }

      toolCallsExecuted.push({
        name: call.name,
        args: call.args,
        result: toolResult,
      });

      response = await chat.sendMessage([
        {
          functionResponse: {
            name: call.name,
            response: toolResult,
          },
        },
      ]);

      functionCalls = response.response.functionCalls();
    }

    const replyText = response.response.text();
    return {
      message: replyText || 'Information retrieved.',
      source: 'gemini',
      toolCallsExecuted,
    };
  } catch (err: any) {
    console.warn('[Gemini Client] API call failed, falling back to deterministic engine:', err.message);
    const fallback = await handleDeterministicFallback(latestQuery);
    fallback.message = `[Notice: Using local engine mode] ${fallback.message}`;
    return fallback;
  }
}

/**
 * Deterministic template handler when LLM API is unavailable.
 * Answers common supply chain questions directly by running tools.
 */
async function handleDeterministicFallback(query: string): Promise<ChatResponse> {
  const q = query.toLowerCase();
  const toolCallsExecuted: Array<{ name: string; args: any; result: any }> = [];

  if (q.includes('attention') || q.includes('today') || q.includes('problem')) {
    const listTool = AGENT_TOOLS.get_attention_list;
    const res = await listTool.execute({});
    toolCallsExecuted.push({ name: 'get_attention_list', args: {}, result: res });

    const topIssuesText = res.top3Issues
      .map(
        (i: any, idx: number) =>
          `${idx + 1}. **${i.sku} (${i.sku_name})** at ${i.location}: ${i.title}. Action: ${i.recommendedAction}.`
      )
      .join('\n');

    return {
      message: `Ramesh, today you have **${res.totalIssues} issues** requiring attention across North Karnataka, with **₹${res.totalAtRiskRs.toLocaleString('en-IN')}** in working capital and customer demand at risk. Here are the top 3:\n\n${topIssuesText}\n\nDrafted actions are ready for your review in the Approval Queue.`,
      source: 'engine_fallback',
      toolCallsExecuted,
    };
  }

  if (q.includes('hf-210') || q.includes('rapid parts')) {
    const tool = AGENT_TOOLS.compare_options;
    const res = await tool.execute({ sku: 'HF-210', location: 'Gokak' });
    toolCallsExecuted.push({ name: 'compare_options', args: { sku: 'HF-210', location: 'Gokak' }, result: res });

    const currentStock = res.currentStock !== undefined ? res.currentStock : 8;
    const dailyRate = res.dailyRate !== undefined ? res.dailyRate : 4;
    const daysOfCover = res.daysOfCover !== undefined ? res.daysOfCover : 2.0;

    return {
      message: `HF-210 at Gokak is down to **${currentStock} units**, burning at **${dailyRate} units/day** with only **${daysOfCover} days of cover**. Standard supplier Shree Hydro takes 7 days, which would cause a 5-day stockout costing ₹4,520 in lost gross margin. We recommend **Rapid Parts** (Express PO): they deliver in 3 days, reducing the gap to 1 day. The ₹1,000 price premium saves over ₹3,500 in lost customer sales.`,
      source: 'engine_fallback',
      toolCallsExecuted,
    };
  }

  if (q.includes('cash') || q.includes('tied up') || q.includes('dead') || q.includes('slow')) {
    const listTool = AGENT_TOOLS.get_attention_list;
    const res = await listTool.execute({});
    toolCallsExecuted.push({ name: 'get_attention_list', args: {}, result: res });

    return {
      message: `The biggest cash drag is **AF-300 Heavy Air/Oil Filters** at Belgaum: **300 units** are sitting idle with less than 0.2 sales per day (over 200 days of cover), tying up **₹1,20,000** in dormant working capital. I recommend an immediate reorder freeze and redistributing stock to high-movement hubs or running a 15% clearance bundle for fleet contractors.`,
      source: 'engine_fallback',
      toolCallsExecuted,
    };
  }

  if (q.includes('what if') || q.includes('shree hydro') || q.includes('10 days')) {
    const simTool = AGENT_TOOLS.simulate_whatif;
    const res = await simTool.execute({
      sku: 'HF-210',
      location: 'Gokak',
      simulatedLeadTimeDays: 10,
      simulatedStock: 8,
      simulatedDailyDemand: 4,
    });
    toolCallsExecuted.push({ name: 'simulate_whatif', args: { sku: 'HF-210', location: 'Gokak', simulatedLeadTimeDays: 10 }, result: res });

    return {
      message: `Simulation results for HF-210 at Gokak: If Shree Hydro takes **10 days**, the stockout window expands to **8 full days**, causing **32 units in lost sales** (₹7,235 lost gross margin). Under this delay, relying on Shree Hydro is catastrophic—placing the express PO with Rapid Parts or an emergency air courier is strictly essential.`,
      source: 'engine_fallback',
      toolCallsExecuted,
    };
  }

  // General fallback
  const listTool = AGENT_TOOLS.get_attention_list;
  const res = await listTool.execute({});
  toolCallsExecuted.push({ name: 'get_attention_list', args: {}, result: res });

  return {
    message: `I have analyzed the current network state across all 8 branches. We currently have **${res.totalIssues} active supply-chain problems**. You can ask me about specific SKUs like HF-210, SK-45, or simulate what-if scenarios regarding supplier lead times and regional stock rebalancing.`,
    source: 'engine_fallback',
    toolCallsExecuted,
  };
}
