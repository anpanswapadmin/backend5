import express from 'express';

import { authRouter } from './auth';
import { userRouter } from './users';
import { auth2Router } from './auth2';
import { user2Router } from './users2';
import { auth3Router } from './auth3';
import { user3Router } from './users3';

export const services = express.Router();

services.use('/auth', authRouter);
services.use('/auth2', auth2Router);
services.use('/auth3', auth3Router);
services.use('/users', userRouter);
services.use('/users2', user2Router);
services.use('/users3', user3Router);
