import { DurableObject } from "cloudflare:workers";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";

export type MemoryAction = "add" | "remove";

type MemoryRecord = {
	mem: string;
	priority: number;
};

export type StoredMemory = MemoryRecord;

export type MemoryManagerResult =
	| { status: "added"; priority: number }
	| { status: "priority-updated"; oldPriority: number; priority: number }
	| { status: "priority-kept"; priority: number }
	| { status: "removed" }
	| { status: "not-found" };

export class MemoryManager extends DurableObject<Env> {
	async list(): Promise<StoredMemory[]> {
		const records = await this.ctx.storage.list<MemoryRecord>({
			prefix: "memory:",
		});

		return Array.from(records.values()).sort(
			(left, right) =>
				right.priority - left.priority || left.mem.localeCompare(right.mem),
		);
	}

	async manage(
		action: MemoryAction,
		priority: number,
		mem: string,
	): Promise<MemoryManagerResult> {
		const digest = await crypto.subtle.digest(
			"SHA-256",
			new TextEncoder().encode(mem),
		);
		const hash = Array.from(new Uint8Array(digest), (byte) =>
			byte.toString(16).padStart(2, "0"),
		).join("");
		const prefix = `memory:${hash}:`;

		return this.ctx.storage.transaction(async (transaction) => {
			const records = await transaction.list<MemoryRecord>({ prefix });

			for (const [key, record] of records) {
				if (record.mem !== mem) continue;

				if (action === "remove") {
					await transaction.delete(key);
					return { status: "removed" };
				}

				if (priority > record.priority) {
					await transaction.put(key, { mem, priority });
					return {
						status: "priority-updated",
						oldPriority: record.priority,
						priority,
					};
				}

				return { status: "priority-kept", priority: record.priority };
			}

			if (action === "remove") return { status: "not-found" };

			const occupiedIndexes = new Set(
				Array.from(records.keys(), (key) => Number(key.slice(prefix.length))),
			);
			let index = 0;
			while (occupiedIndexes.has(index)) index++;

			await transaction.put(`${prefix}${index}`, { mem, priority });
			return { status: "added", priority };
		});
	}
}

const memoryManagerInput = z.object({
	action: z.enum(["add", "remove"]),
	priority: z.number().int().min(1).max(20),
	mem: z.string(),
});

export function registerMemoryManagerTool(
	server: McpServer,
	namespace: DurableObjectNamespace<MemoryManager>,
): void {
	server.registerTool(
		"memory_manager",
		{
			description:
				"Adiciona ou remove uma memória persistente, identificada pelo texto exato.",
			inputSchema: memoryManagerInput,
		},
		async ({ action, priority, mem }) => {
			const result = await namespace
				.get(namespace.idFromName("memory-manager"))
				.manage(action, priority, mem);

			switch (result.status) {
				case "added":
					return {
						content: [
							{
								type: "text",
								text: `Memória adicionada com prioridade ${result.priority}.`,
							},
						],
					};
				case "priority-updated":
					return {
						content: [
							{
								type: "text",
								text: `Memória existente: prioridade atualizada de ${result.oldPriority} para ${result.priority}.`,
							},
						],
					};
				case "priority-kept":
					return {
						content: [
							{
								type: "text",
								text: `Memória existente: prioridade ${result.priority} mantida.`,
							},
						],
					};
				case "removed":
					return {
						content: [{ type: "text", text: "Memória removida." }],
					};
				case "not-found":
					return {
						content: [
							{
								type: "text",
								text: "Memória não encontrada; nada foi removido.",
							},
						],
					};
			}
		},
	);
}
