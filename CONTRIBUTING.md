# Contributing to Memora

Thank you for your interest in contributing to Memora!

## Before you start

- Check existing issues to avoid duplicating work.
- For significant changes, open an issue first to discuss the proposed approach.
- Keep pull requests focused and explain the reason for the change.

## Reporting bugs

When opening an issue, include:

- A clear description of the problem.
- Steps to reproduce it.
- What you expected to happen and what actually happened.
- Relevant error messages, with all secrets and private information removed.

Do not include passwords, API keys, encryption keys, private data, or the
contents of environment files in issues or pull requests.

## Making changes

1. Fork the repository and create a branch for your change.
2. Install dependencies using `npm ci`.
3. Make and test your changes.
4. Run `npx tsc --noEmit` and `npm run build`.
5. Describe your changes and any testing limitations in your pull request.

For Docker-related changes, test the relevant Docker build and startup steps
when practical. Never use real production credentials in examples or tests.

## Pull requests

Please explain:

- What changed and why.
- How you tested the change.
- Whether documentation or configuration needs updating.

By submitting a contribution, you confirm that you have the right to submit it
under the project's MIT License. Contributions remain subject to any applicable
third-party license terms.

Contributions are reviewed by the project maintainer; submission does not
guarantee acceptance.
