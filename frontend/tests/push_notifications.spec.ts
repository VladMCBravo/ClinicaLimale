import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Módulo de Push Notifications (Frontend)', () => {

  test('Deve pedir permissão nativa, gerar PushSubscription e enviar o Payload correto para a API', async ({ page, context }) => {
    
    // 1. Concedemos a permissão de notificação no nível do navegador (como se o usuário clicasse em "Permitir")
    await context.grantPermissions(['notifications']);
    
    // 2. A MÁGICA: Em vez de injetar um 'fetch' manual, nós "enganamos" o navegador 
    // injetando um ServiceWorker falso antes da página carregar.
    // Assim, o SEU código React (hook de push) vai rodar o fluxo normal achando que está num celular real.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: async () => ({}),
          ready: Promise.resolve({
            pushManager: {
              subscribe: async () => ({
                endpoint: 'https://fcm.googleapis.com/fcm/send/meu-celular-e2e',
                toJSON: () => ({
                  endpoint: 'https://fcm.googleapis.com/fcm/send/meu-celular-e2e',
                  keys: {
                    p256dh: 'chave_publica_valida_gerada_pelo_sw',
                    auth: 'chave_auth_valida_gerada_pelo_sw'
                  }
                })
              })
            }
          })
        },
        writable: true
      });
    });

    // 3. Interceptamos a chamada para a nossa API recém-criada no Django
    let payloadEnviado: any = null;
    
    await page.route('**/api/push/subscribe/', async route => {
      // Capturamos os dados exatos que o seu React tentou enviar pro Django
      payloadEnviado = JSON.parse(route.request().postData() || '{}');
      
      // Devolvemos o status HTTP 201 Created que codificamos nas Views do Django
      await route.fulfill({ 
        status: 201, 
        contentType: 'application/json',
        body: JSON.stringify({ status: 'Inscrito com sucesso!' }) 
      });
    });

    // 4. Rodamos o fluxo normal do usuário
    await page.goto(`${BASE_URL}/login`);
    await page.locator('input[name="username"], input[type="text"]').first().fill('Teste'); 
    await page.locator('input[name="password"], input[type="password"]').first().fill('Teste@123');  
    await page.getByRole('button', { name: 'Entrar' }).click();

    // Aguarda a tela inicial carregar para dar tempo do Hook de Push do React disparar
    await expect(page.getByText('Olá, Dr.')).toBeVisible();

    // (Opcional) Se na sua UI você tem um botão específico para pedir a permissão, 
    // descomente a linha abaixo e adapte o nome do botão:
    await page.getByRole('button', { name: '0' }).click(); // Clica no botão de notificação (sininho do seu header)

    // 5. Validação Rigorosa: Espera o request bater na rota mockada
    await page.waitForResponse('**/api/push/subscribe/');

    // 6. Assertions: Garantimos que o Frontend enviou exatamente o que o Backend pede!
    expect(payloadEnviado).not.toBeNull();
    expect(payloadEnviado.endpoint).toContain('fcm.googleapis.com');
    expect(payloadEnviado.keys).toBeDefined();
    
    // Valida se as chaves existem para não bater no erro HTTP 400 que criamos no views.py
    expect(payloadEnviado.keys.p256dh).toBe('chave_publica_valida_gerada_pelo_sw');
    expect(payloadEnviado.keys.auth).toBe('chave_auth_valida_gerada_pelo_sw');
  });

});