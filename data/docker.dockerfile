# Stänger ner containern och tar bort (-v) den anslutna databasvolymen
docker-compose down -v

# Startar upp en helt ren och tom MySQL-databas igen
docker-compose up -d