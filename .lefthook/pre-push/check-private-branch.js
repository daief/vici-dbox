#!/usr/bin/env node

const privateRemoteName = 'private';
const privateBranchRef = 'refs/heads/private';
const remoteName = process.argv[2];

if (!remoteName) {
  console.error('Unable to determine the target remote for this push.');
  process.exit(1);
}

const pushUpdates = [];

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => pushUpdates.push(chunk));
process.stdin.on('end', () => {
  const isPrivateBranchPush = pushUpdates
    .join('')
    .split(/\r?\n/)
    .filter(Boolean)
    .some(line => {
      const [localRef, , remoteRef] = line.trim().split(/\s+/);
      return localRef === privateBranchRef || remoteRef === privateBranchRef;
    });

  if (isPrivateBranchPush && remoteName !== privateRemoteName) {
    console.error(
      `Push rejected: the ${privateBranchRef} branch may only be pushed to the '${privateRemoteName}' remote (received '${remoteName}').`,
    );
    process.exitCode = 1;
  }
});
