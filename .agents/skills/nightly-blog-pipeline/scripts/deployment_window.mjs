import { appendFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { json, phase, shanghai } from './runtime.mjs';

export function deploymentWindow({ eventName, inputs = {}, sha, now = new Date() }) {
  const day = shanghai(now).day;
  if (phase(now) === 'publish') return { allowed: true, daytime_exception: false,
    start_deadline: Date.parse(`${day}T05:25:00+08:00`), deadline: Date.parse(`${day}T05:30:00+08:00`) };
  const stop = Date.parse(inputs.approved_until);
  const manual = eventName === 'workflow_dispatch' && ['true', true].includes(inputs.confirm_daytime)
    && /^[a-f0-9]{40}$/.test(sha || '') && inputs.approved_sha === sha
    && stop > now.getTime() + 60000 && stop - now.getTime() <= 2 * 3600000;
  return manual ? { allowed: true, daytime_exception: true, start_deadline: stop - 60000, deadline: stop }
    : { allowed: false, daytime_exception: false, start_deadline: 0, deadline: 0 };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const payload = await json(process.env.GITHUB_EVENT_PATH);
  const result = deploymentWindow({ eventName: process.env.GITHUB_EVENT_NAME, inputs: payload.inputs, sha: process.env.GITHUB_SHA });
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, Object.entries(result).map(([k, v]) => `${k}=${v}\n`).join(''));
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
