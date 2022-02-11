#!/bin/bash

set -ex
if [ "$GERRIT_PROJECT" == "canvas-lms" ]; then
  # when parent is not in $GERRIT_BRANCH (i.e. master)
  if ! git merge-base --is-ancestor HEAD~1 origin/$GERRIT_BRANCH; then
    message="This commit is built upon commits not currently merged in $GERRIT_BRANCH. Ensure that your dependent patchsets are merged first!\\n"
    gergich comment "{\"path\":\"/COMMIT_MSG\",\"position\":1,\"severity\":\"warn\",\"message\":\"$message\"}"
  fi

  # when modifying Dockerfile or Dockerfile.jenkins*, Dockerfile.template must also be modified.
  ruby build/dockerfile_writer.rb --env development --compose-file docker-compose.yml,docker-compose.override.yml --in build/Dockerfile.template --out Dockerfile
  ruby build/dockerfile_writer.rb --env jenkins --compose-file docker-compose.yml,docker-compose.override.yml --in build/Dockerfile.template --out Dockerfile.jenkins
  if ! git diff --exit-code Dockerfile; then
    message="Dockerfile and build/Dockerfile.template need to be kept in sync. Update Dockerfile by running the command given at the top.\\n"
    gergich comment "{\"path\":\"\Dockerfile\",\"position\":1,\"severity\":\"error\",\"message\":\"$message\"}"
  fi
  if ! git diff --exit-code Dockerfile.jenkins; then
    message="Dockerfile.jenkins and build/Dockerfile.template need to be kept in sync. Update Dockerfile.jenkins by running the command given at the top.\\n"
    gergich comment "{\"path\":\"\Dockerfile.jenkins\",\"position\":1,\"severity\":\"error\",\"message\":\"$message\"}"
  fi
fi

gergich capture custom:./build/gergich/xsslint:Gergich::XSSLint 'node script/xsslint.js'
gergich capture i18nliner 'rake i18n:check'
# purposely don't run under bundler; they shell out and use bundler as necessary
ruby script/brakeman
ruby script/tatl_tael
ruby script/stylelint
ruby script/rlint --no-fail-on-offense
[ "${SKIP_ESLINT-}" != "true" ] && ruby script/eslint
ruby script/lint_commit_message
node script/yarn-validate-workspace-deps.js 2>/dev/null < <(yarn --silent workspaces info --json)

gergich status
echo "LINTER OK!"
