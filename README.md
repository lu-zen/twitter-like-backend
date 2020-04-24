# twitter-like-backend

A twitter based backend build with Koa, ArangoDB, paseto and argon2.

## Requirements
- Docker CE;
- docker-compose;
- Node.js >= 12.16.2;

## Installation

- Run docker-compose up to create api and db containers;
- Execute bash on db container `docker exec -it db /bin/sh`
- Restore the database dumb `arangorestore --create-collection true --import-data false --input-directory "dump"`

## Usage
Two containers will be created: rest api and db, listening on hosts ports 3000 and 3005 respectively;
All database files live inside the './arangoData' folder;

## Uninstall / Remove Containers
docker-compose down

## License
[MIT](https://choosealicense.com/licenses/mit/)