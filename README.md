# Gerenciador de Inventário Pro

Sistema full-stack para controle de ativos e licenças.

## Como Atualizar o Sistema com Segurança

Este projeto conta com um script de automação que faz o backup de tudo antes de aplicar as mudanças do GitHub.

### 1. Dar permissão ao script
```bash
chmod +x /var/www/Inventario/update.sh
```

### 2. Rodar a atualização
```bash
sudo ./update.sh
```

**O que o script faz:**
1. Salva o banco de dados em `/var/www/inventario_backups/`.
2. Salva seu arquivo `.env`.
3. Puxa as novidades do Git.
4. Restaura o `.env` e o banco de dados original.
5. Reinstala dependências e reinicia o PM2.

---

## Estrutura
- Frontend: `/var/www/Inventario`
- Backend API: `/var/www/Inventario/inventario-api`
