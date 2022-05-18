docker-compose exec web sh
docker-compose run --no-deps --rm web touch Gemfile.lock
docker-compose exec web bundle exec rake canvas:compile_assets_dev
docker-compose run --no-deps --rm web ./script/install_assets.sh -c bundle
Copy-Item docker-compose/config/*.yml config/
Copy-Item config/docker-compose.override.yml.example docker-compose.override.yml
docker-compose up --build
Set-Content -Path '.env' -Value '$Env:COMPOSE_FILE=docker-compose.yml:docker-compose.override.yml'
