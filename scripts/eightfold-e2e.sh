#!/usr/bin/env bash
# Prove the Treasury end-to-end loop against the live public registry:
# list the registry, install the developer bundle, activate its adaptation in a
# native Harness profile, execute the installed package, and assert the output.
#
# Requires network access to the public Treasury (and its codeload archive),
# `git` for branch resolution, and pnpm for native profile linking.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

home="${EIGHTFOLD_HOME:-.eightfold}"
rm -rf "$home"
export EIGHTFOLD_HOME="$repo_root/$home"
export DSH_HOME="$repo_root/$home/dsh-home"
profile="treasury-e2e"

echo "== dsh eightfold treasury list =="
node --import tsx/esm apps/cli/src/bin.ts eightfold treasury list

echo
echo "== dsh eightfold add developer --profile $profile =="
node --import tsx/esm apps/cli/src/bin.ts eightfold add developer --profile "$profile"

echo
echo "== assert profile activation =="
config="$(node --import tsx/esm apps/cli/src/bin.ts --profile "$profile" --dump-config)"
if ! grep -q 'hello-eightfold' <<<"$config"; then
  printf 'expected profile config to contain hello-eightfold\n' >&2
  exit 1
fi
echo "OK: hello-eightfold is active in profile $profile"

echo
echo "== execute the installed adaptation with {\"name\":\"Dino\"} =="
module="file://$EIGHTFOLD_HOME/adaptations/hello-eightfold/index.js"
actual="$(node --input-type=module -e \
  "const m = await import('$module'); console.log(m.eightfoldHello(JSON.parse('{\"name\":\"Dino\"}')))")"
echo "$actual"

echo
echo "== assert expected output =="
expected="Hello Dino from Eightfold."
if [[ "$actual" != "$expected" ]]; then
  printf 'expected %s, got %s\n' "$expected" "$actual" >&2
  exit 1
fi
echo "OK: $actual"
