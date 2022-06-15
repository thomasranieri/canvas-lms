$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..
Set-Content -Path '.env' -Value "COMPOSE_FILE=docker-compose.yml;docker-compose.override.yml`nPASSENGER_STARTUP_TIMEOUT=3000"
Copy-Item docker-compose/config/*.yml config/
Copy-Item config/docker-compose.override.yml.example docker-compose.override.yml
#Then add APP_DOMAIN: localhost to environment of jobs
#and add to web:
# ports:
# - 127.0.0.1:80:80

docker-compose up --build -d
docker-compose run --no-deps --rm web touch Gemfile.lock
docker-compose run --no-deps --rm web ./script/install_assets.sh -c bundle
docker-compose run --no-deps --rm web ./script/install_assets.sh -c yarn
docker-compose run --no-deps --rm web ./script/install_assets.sh -c compile #takes 15-20 minutes on my computer
docker-compose run --no-deps --rm web bundle exec rake db:migrate RAILS_ENV=development
docker-compose run --no-deps --rm web bundle exec rake db:initial_setup
