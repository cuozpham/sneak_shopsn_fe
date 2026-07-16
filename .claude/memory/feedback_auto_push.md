---
name: feedback-auto-push
description: After completing any code change, automatically commit and push to remote without waiting for user to ask
metadata:
  type: feedback
---

Always commit and push to `origin main` after finishing any code change task.

**Why:** User explicitly said "cứ làm xong push lên cho t" — they don't want to ask separately each time.

**How to apply:** At the end of every task that modifies files, run `git add <changed files> && git commit && git push origin main` automatically.
