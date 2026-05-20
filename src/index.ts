#!/usr/bin/env node

import dotenv from 'dotenv';
import { setupCLI } from './cli/index.js';

dotenv.config();

const program = setupCLI();
program.parse(process.argv);
