const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send({ message: 'I am alive' }).status(200);
});

// 模拟 200 的路由
router.get('/product/all', async (req, res) => {
  await new Promise((resolve) => {
    setTimeout(resolve, 500);
  });
  res
    .send({
      data: [
        { id: '1001', name: '测试产品', price: '100' },
        { id: '1002', name: '产品样本', price: '200' },
      ],
    })
    .status(200);
});

// 模拟 400 错误的路由
router.get('/product/search', (req, res) => {
  res.status(400).send({ error: 'Bad Request' });
});

// 模拟 500 错误的路由
router.post('/product/add', (req, res) => {
  res.status(500).send({ error: 'Internal Server Error' });
});

module.exports = router;
