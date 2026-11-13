import type { McpServer } from "@modelcontextprotocol/server";
import type { MemoryManager } from "./memory-manager";

export function registerInternalPrompts(
	server: McpServer,
	namespace: DurableObjectNamespace<MemoryManager>,
): void {
	server.registerPrompt(
		"list memory",
		{
			title: "/list memory",
			description:
				"Lista as memórias realmente armazenadas, com conteúdo e prioridade.",
		},
		async () => {
			const memories = await namespace
				.get(namespace.idFromName("memory-manager"))
				.list();
			const text =
				memories.length === 0
					? "Nenhuma memória está armazenada no Memory Manager."
					: [
							"Memórias armazenadas (ordenadas por prioridade decrescente):",
							...memories.map(
								(memory) =>
									`- Prioridade ${memory.priority}: ${memory.mem}`,
							),
						].join("\n");

			return {
				messages: [{ role: "user", content: { type: "text", text } }],
			};
		},
	);

	server.registerPrompt(
		"scomp",
		{
			title: "/scomp",
			description:
				"Compacta o contexto atual preservando informações importantes.",
		},
		() => ({
			messages: [
				{
					role: "user",
					content: {
						type: "text",
						text: [
							"Faça uma compactação inteligente do contexto da conversa atualmente disponível. Use somente informações presentes nesse contexto; não invente dados nem afirme acesso a mensagens ou estados que não foram fornecidos.",
							"Preserve objetivos, requisitos, decisões, preferências e instruções do usuário; detalhes técnicos, nomes de arquivos, caminhos, identificadores, versões e comandos; problemas encontrados, soluções tentadas e estado atual dos projetos; pendências e próximos passos.",
							"Remova redundâncias e informações irrelevantes sem descartar informações importantes apenas para reduzir o tamanho.",
							"Organize o resultado exatamente nestas seções:",
							"1. Contexto geral.",
							"2. Informações importantes.",
							"3. Decisões e preferências.",
							"4. Estado atual.",
							"5. Pendências e próximos passos.",
							"Se algum tipo de informação não estiver disponível no contexto, indique isso em vez de inferi-la.",
						].join("\n\n"),
					},
				},
			],
		}),
	);
}
