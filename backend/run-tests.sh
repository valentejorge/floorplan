# Para rodar os testes com SQLite (necessário no Arch Linux sem php-sqlite instalado):
php \
  -d "extension=/home/jorge/projects/floorplan/.tmp/usr/lib/php/modules/pdo_sqlite.so" \
  -d "extension=/home/jorge/projects/floorplan/.tmp/usr/lib/php/modules/sqlite3.so" \
  vendor/bin/phpunit "$@"
