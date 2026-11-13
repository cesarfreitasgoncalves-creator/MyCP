import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { MemoryManager, registerMemoryManagerTool } from "./memory-manager";

export { MemoryManager };

function createServer(env: Env) {
	const server = new McpServer({
		name: "MyCP",
		version: "1.0.0",
	});

	registerMemoryManagerTool(server, env.MEMORY_MANAGER);
	return server;
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const handler = createMcpHandler(() => createServer(env), {
			route: "/mcp",
		});
		return handler(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;
