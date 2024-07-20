require('dotenv').config();
const mongoose = require('mongoose');
const TelegramBot = require('node-telegram-bot-api');

mongoose.connect(process.env.DB_URL)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB', error);
  });

const User = require('./models/User');
const Order = require('./models/Order');
const Message = require('./models/Message');

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

const sessions = {};

const commands = [
  { command: '/start', description: 'Розпочати' },
  { command: '/order', description: 'Перевірити статус замовлення' },
  { command: '/operator', description: "Зв'язатися з оператором" },
];

bot.setMyCommands(commands)
  .then(() => console.log('Bot commands set'))
  .catch((error) => console.error('Error setting bot commands', error));

bot.on('new_chat_members', (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Вам потрібно зареєструватися спочатку. Використовуйте команду /start для початку.", {
    reply_markup: {
      keyboard: [[{ text: "/start", callback_data: "start" }]],
      one_time_keyboard: true,
    },
  });
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === '/start') {
    bot.sendMessage(chatId, "Доброго дня, вас вітає Kwizbot!");
    setTimeout(() => {
      bot.sendMessage(chatId, "Поділіться номером телефону", {
        reply_markup: {
          keyboard: [[{ text: "Поділитися номером телефону", request_contact: true }]],
          one_time_keyboard: true,
        },
      });
    }, 1500); 
  } else if (text === '/order') {
    bot.sendMessage(chatId, "Вкажіть номер вашого замовлення");
    sessions[chatId] = sessions[chatId] || {};
    sessions[chatId].awaitingOrder = true;
  } else if (text === '/operator') {
    sessions[chatId] = sessions[chatId] || {};
    sessions[chatId].awaitingOperator = true;
    bot.sendMessage(chatId, "Ви можете написати своє питання, і наш оператор зв'яжеться з вами.");
  } else {
    sessions[chatId] = sessions[chatId] || {};
    const { phone, awaitingOrder, awaitingOperator, awaitingCity } = sessions[chatId];

    if (awaitingOrder) {
      const orderId = text;
      const user = await User.findOne({ chatId });

      if (user) {
        const order = await Order.findOne({ phone: user.phone, orderId });
        if (order) {
          bot.sendMessage(chatId, `Статус вашого замовлення: ${order.status}\nДеталі замовлення: ${order.details}`);
        } else {
          bot.sendMessage(chatId, "Замовлення не знайдено. Перевірте номер замовлення та спробуйте знову.");
        }
      } else {
        bot.sendMessage(chatId, "Вам потрібно зареєструватися спочатку. Використовуйте команду /start для початку.");
      }
      sessions[chatId].awaitingOrder = false;
    } else if (awaitingOperator) {
      let user = await User.findOne({ chatId });

      if (user) {
        const existingMessage = await Message.findOne({ phone: user.phone });
        if (existingMessage) {
          bot.sendMessage(chatId, "Повідомлення з таким номером телефону вже існує.");
        } else {
          const message = new Message({
            phone: user.phone,
            message: text,
            orderId: ''
          });
          try {
            await message.save();
            bot.sendMessage(chatId, "Ваше повідомлення надіслано оператору. Очікуйте відповіді.");
            sessions[chatId].awaitingOperator = false;
          } catch (error) {
            console.error('Error saving message:', error);
            bot.sendMessage(chatId, "Виникла помилка при збереженні повідомлення. Спробуйте пізніше.");
          }
        }
      } else {
        bot.sendMessage(chatId, "Вам потрібно зареєструватися спочатку. Використовуйте команду /start для початку.");
      }
    } else if (awaitingCity) {
      const city = text;
      let user = await User.findOne({ phone: sessions[chatId].phone });
      if (user) {
        user.city = city;
        try {
          await user.save();
          bot.sendMessage(chatId, `Дякуємо, ${user.firstName}! Ваше місто збережено.`);
          setTimeout(() => {
            showCompanyInfo(chatId);
          }, 1500); 
        } catch (error) {
          console.error('Error saving user:', error);
        }
      }
      sessions[chatId].awaitingCity = false;
    } else if (phone) {
      let user = await User.findOne({ phone });

      if (!user && text) {
        const [firstName, ...lastName] = text.split(" ");
        user = new User({ phone, firstName, lastName: lastName.join(" "), chatId });

        try {
          await user.save();
          bot.sendMessage(chatId, `Вітаємо, ${firstName}! Вкажіть ваше місто.`);
          sessions[chatId].awaitingCity = true;
        } catch (error) {
          console.error('Error saving user:', error);
        }
      } else if (user) {
        bot.sendMessage(chatId, `Вітаємо, ${user.firstName}! Чим я можу допомогти?`);
        setTimeout(() => {
          showCompanyInfo(chatId);
        }, 1500); 
      } else {
        bot.sendMessage(chatId, "Вам потрібно зареєструватися спочатку. Використовуйте команду /start для початку.");
      }
    }
  }
});

bot.on('contact', async (msg) => {
  const phone = msg.contact.phone_number;
  const chatId = msg.chat.id;

  console.log(`Received contact with phone number: ${phone}`);
  console.log(`Chat ID: ${chatId}`);

  let user = await User.findOne({ phone });

  if (!user) {
    bot.sendMessage(chatId, "Вкажіть будь ласка ваше ім'я та прізвище");
    sessions[chatId] = { phone, chatId };
  } else if (user) {
    bot.sendMessage(chatId, `Вітаємо, ${user.firstName}! Чим я можу допомогти?`);
    setTimeout(() => {
      showCompanyInfo(chatId);
    }, 1500);
  } else {
    bot.sendMessage(chatId, "Вам потрібно зареєструватися спочатку. Використовуйте команду /start для початку.");
  }
});

function showCompanyInfo(chatId) {
  setTimeout(() => {
    bot.sendMessage(chatId, "Інформація про компанію: поки відсутня");
    setTimeout(() => {
      bot.sendMessage(chatId, "/order - перевірити статус замовлення");
      setTimeout(() => {
        bot.sendMessage(chatId, "/operator - зв'язатися з оператором");
      }, Math.random() * 1000 + 1000); 
    }, Math.random() * 1000 + 1000);
  }, Math.random() * 1000 + 1000);
}
