/** Durable resume adapter. Jobs are authorised and replay-guarded before resumption. */
export async function executeResumeEventNode(input) {
    const { attempt, tenantId, userId, runId, version, authorize, flows } = input;
    if (attempt > 1)
        throw new Error('Flow replay requires explicit reconciliation');
    if (!await authorize())
        throw new Error('Job authorization changed');
    await flows.resumeWaitingInterview(tenantId, userId, runId, version);
}
