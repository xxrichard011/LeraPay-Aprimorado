# Como rodar o LeraPay localmente com Docker #

# Pré-requisito

*Docker Desktop* instalado (já vem com Docker Compose): https://www.docker.com/products/docker-desktop

# Passo 1 — Configurar o .env

Na raiz do projeto:

"cp .env.example .env"

Abra o ".env" e preencha:

# 1- CREDENTIALS_ENCRYPTION_KEY
*Gere uma chave e cole em CREDENTIALS_ENCRYPTION_KEY*

Abra o powershell e digite esse comando: openssl rand -hex 32

*Copie o código gerado*

E preencha o *CREDENTIALS_ENCRYPTION_KEY*

Esse código evita que se alguem tiver acesso direto ao banco de dados, consiga ler essas credenciais em texto puro. Elas ficam cifradas no MySQL e só são decifradas pelo backend na hora de fazer as chamadas HTTP pro gateway.

# 2- JWT_SECRET

*Apenas coloque uma senha forte e coloque em JWT_SECRET.*

Serve para assinar e validar os tokens JWT usados na autenticação do sistema, isso garante que o token gerado no login (POST /auth/login) é autenticado e nao foi tentado acessar por desconhecido td vez que uma requisição chega em uma rota protegida da API.

# 3- JWT_EXPIRES_IN

*Aqui voce define um valor de horas com "h" no final que define quando vai ser expirado a pagina e tera que fazer login novamente, eu deixe 24h por exemplo*

# 4- PUBLIC_BASE_URL

*Aqui para validar autenticidade dos webhooks recebidos, como estamos instalando localmente eu utilizo o ngrok.*

*Como instalar o ngrok* -> acesse: https://ngrok.com/download e siga o instalador, logo após crie sua conta em: https://dashboard.ngrok.com/signup e pegue o authtoken em: https://dashboard.ngrok.com/get-started/your-authtoken e rode no cmd:

        ngrok config add-authtoken seutoken

Ainda no cmd como o backend esta rodando no *Docker* na porta *3001* utilize esse comando: ngrok http 3001.

Vai aparecer uma URL apontando para -> http://localhost:3001

Copie e colo esse URL em: *PUBLIC_BASE_URL*

Isso serve para quando o gateway envia uma notificação para o endpoint POST /webhooks/lera-box, ele assina essa requisição com um "código secreto", obackend usa essa mesma chave para conferir a assinatura no X-Lera-Box-Signature, isso garante que a notificação realmente veio do gateway e não de alguem desconhecido tentando invadir.

# 5- Configuração para o envio de email

- SMTP_HOST=smtp.gmail.com
- SMTP_PORT=587
- SMTP_USER=seuemail@gmail.com
- SMTP_PASSWORD=xxxx xxxx xxxx xxxx
- SMTP_FROM=seuemail@gmail.com

Estou utilizando o *Gmail* mesmo para fazer isso, Host e Port deixe a padrão SMTP mesmo, em *SMTP_USER* e *SMTP_FROM* coloque o email que vai utilizado para fazer o envio, em *SMTP_PASSWORD* não é a senha do seu email, é um codigo gerado dentro do gmail. É necessario estar com o 2fa ativo se não tiver clique nesse link: https://myaccount.google.com/security e ative, agora para conseguir o código gerado clique aqui: https://myaccount.google.com/apppasswords. Em Nome do app digite qualquer nome tipo "LeraPay". Clique em Gerar e vai aparecer um código com 16 letras (xxxx yyyy zzzz aaaa) copie e cole e remova os espaços em *SMTP_PASSWORD* ficando assim: xxxxyyyyzzzzaaaa

# Opcional para conta DEMO.

*Os Dados opcionais para uma conta DEMO estará no final desse README*

# Passo 2 - Subir o projeto

*No CMD rode:*

docker compose up --build

*Isso sobe:*

- *Frontend*: http://localhost:8081
- *Backend / Swagger*: http://localhost:3001/docs
- *MySQL*: localhost:3307

# Outros comandos úteis

docker compose up --build -d     # roda em segundo plano
docker compose logs -f           # ver logs
docker compose down              # parar tudo
docker compose down -v           # parar e apagar dados do MySQL


# Passo 3 - Acessar o projeto

*Acesse:* http://localhost:8081/

*Clique em:* Criar conta e coloque suas credenciais.

Após logar ainda não vai estar cadastrado e autenticado, Na aba *Conta no gateway* em *Cadastro público* preencha as informações ficticias com apenas *Email e Telefone real*, logo após será enviado as informações no *Email* que voce cadastrou essas informações voce utilizar no painel a direta para logar no gateway.

*Pronto voce está logado no sistema*


# Opcional para conta DEMO.

*Dados para uma conta DEMO porem sem cadastro*

Aqui voce define qual vai ser o user, email e senha.

- DEMO_USER_NAME=
- DEMO_USER_EMAIL=
- DEMO_USER_PASSWORD=

*Dados para uma conta ja cadastrada voce utiliza os dados de uma conta que ja tem cadastro apenas como DEMO para visualizar*

`(Volte aqui quando ja tiver uma conta cadastrada)`

São os dados da conta cadastrada que voce recebeu por email

- DEMO_GATEWAY_PERSON_TYPE= PF ou PJ
- DEMO_GATEWAY_DOCUMENT= 12345678900 (Exemplo de Documento)
- DEMO_GATEWAY_PASSWORD= Senha que recebeu por email
- DEMO_GATEWAY_EMAIL= Email utilizado no cadastro
- DEMO_GATEWAY_PHONE= Celular utilizado no cadastro

*Agora voce vai no CMD e roda*

docker compose up --build -d

*Depois rode o seed dentro do container*

docker compose exec backend node dist/seed/seed-demo.js

*Logo abaixo vai aparecer as informações da conta criada e logo após é só acessar com as informações que ja estara funcionando*