# NovaFunds

Plateforme de micro-tâches avec un frontend statique et une API Node.js/Express.

## Structure

- `frontend/` : pages publiques, utilisateur et administration
- `backend/` : API Express et intégration PostgreSQL
- `database/` : schéma et données initiales PostgreSQL

## Démarrage local

1. Créez `backend/.env` avec les paramètres de la base de données et une clé JWT sûre.
2. Importez `database/schema.sql` dans PostgreSQL.
3. Lancez l’API : `cd backend && npm install && npm start`.
