#!/usr/bin/env bash
# Prove the Treasury end-to-end loop against the live public registry:
# list the registry, install hello-eightfold, execute the installed
# adaptation, and assert the exact expected output.
#
# Requires network access to the public Treasury (and its codeload archive)
# plus `git` for branch resolution. The local home defaults to .eightfold/
# under the invoking directory; EIGHTFOLD_HOME overrides it.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

home="${EIGHTFOLD_HOME:-.eightfold}"
rm -rf "$home"

echo "== dsh eightfold treasury list =="
node --import tsx/esm apps/cli/src/bin.ts eightfold treasury list

echo
echo "== dsh eightfold add hello-eightfold =="
node --import tsx/esm apps/cli/src/bin.ts eightfold add hello-eightfold

echo
echo "== execute the installed adaptation with {\"name\":\"Dino\"} =="
module="file://$(pwd)/$home/adaptations/hello-eightfold/src/index.ts"
node --import tsx/esm --input-type=module -e \
  "const m = await import('$module'); console.log(m.eightfoldHello(JSON.parse('{\"name\":\"Dino\"}')))"

echo
echo "== assert expected output =="
actual="$(node --import tsx/esm --input-type=module -e \
  "const m = await import('$module'); console.log(m.eightfoldHello(JSON.parse('{\"name\":\"Dino\"}')))")"
expected="Hello Dino from Eightfold."
if [[ "$actual" != "$expected" ]]; then
  printf 'expected %s, got %s\n' "$expected" "$actual" >&2
  exit 1
fi
echo "OK: $actual"
