/** Roll back this Flow's record work to its transaction savepoint and renew it. */
export async function executeRollbackRecordsNode(client, rollbackSavepoint) {
    await client.query('ROLLBACK TO SAVEPOINT ' + rollbackSavepoint);
    await client.query('RELEASE SAVEPOINT ' + rollbackSavepoint);
    await client.query('SAVEPOINT ' + rollbackSavepoint);
}
