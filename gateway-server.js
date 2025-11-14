require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const wallet = new ethers.Wallet(process.env.GATEWAY_PRIVATE_KEY || ethers.Wallet.createRandom().privateKey);

console.log('Gateway:', wallet.address);

const DOMAIN_SEPARATOR = ethers.id('AITokenizer.Receipt.v1');

app.post('/api/inference', async (req, res) => {
  try {
    const { userId, serviceId, prompt, modelId } = req.body;
    
    const aiResponse = `AI Response: Your gateway is working! Prompt was: "${prompt}"`;
    const inputTokens = Math.ceil(prompt.split(/\s+/).length * 1.3);
    const outputTokens = 150;
    const totalTokens = inputTokens + outputTokens;
    
    const nonce = '0x' + crypto.randomBytes(32).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000);
    
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'bytes32', 'uint256', 'uint256', 'bytes32', 'bytes32'],
      [userId, serviceId, totalTokens, timestamp, nonce, DOMAIN_SEPARATOR]
    );
    
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));
    
    res.json({
      success: true,
      response: aiResponse,
      receipt: {
        userId, serviceId, inputTokens, outputTokens, totalTokens,
        timestamp, nonce, signature, gatewayAddress: wallet.address
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', gatewayAddress: wallet.address });
});

app.get('/api/models', (req, res) => {
  res.json({
    models: [
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', serviceId: ethers.id('gpt-4-turbo'), price: '0.01' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', serviceId: ethers.id('gpt-3.5-turbo'), price: '0.002' }
    ]
  });
});

app.listen(PORT, () => console.log('Gateway running on', PORT));