import axios from 'axios';
import { Config } from './config';
import { fixAndParseJson } from './json_parser';
import { logger } from './logger';
import { sayText } from './speak';
import { Spinner } from './spinner';
import { cleanInput } from './utils';
import * as cmd from './commands';

class Agent {
  ai_name: string;
  memory: any;
  full_message_history: any[];
  next_action_count: number;
  prompt: string;
  user_input: string;

  constructor(
    ai_name: string,
    memory: any,
    full_message_history: any[],
    next_action_count: number,
    prompt: string,
    user_input: string,
  ) {
    this.ai_name = ai_name;
    this.memory = memory;
    this.full_message_history = full_message_history;
    this.next_action_count = next_action_count;
    this.prompt = prompt;
    this.user_input = user_input;
  }

  async start_interaction_loop() {
    const cfg = new Config();
    let loop_count = 0;
    let command_name: string | null = null;
    let arguments: any = null;
    while (true) {
      loop_count += 1;
      if (
        cfg.continuous_mode &&
        cfg.continuous_limit > 0 &&
        loop_count > cfg.continuous_limit
      ) {
        logger.typewriter_log(
          'Continuous Limit Reached: ',
          'yellow',
          `${cfg.continuous_limit}`,
        );
        break;
      }

      const spinner = new Spinner('Thinking... ');
      spinner.start();
      const assistant_reply = await chat_with_ai(
        this.prompt,
        this.user_input,
        this.full_message_history,
        this.memory,
        cfg.fast_token_limit,
      );
      spinner.stop();

      print_assistant_thoughts(this.ai_name, assistant_reply);

      try {
        [command_name, arguments] = cmd.get_command(
          attempt_to_fix_json_by_finding_outermost_brackets(assistant_reply),
        );
        if (cfg.speak_mode) {
          sayText(`I want to execute ${command_name}`);
        }
      } catch (e) {
        logger.error('Error: \n', e.toString());
      }

      if (!cfg.continuous_mode && this.next_action_count === 0) {
        this.user_input = '';
        logger.typewriter_log(
          'NEXT ACTION: ',
          'cyan',
          `COMMAND = ${command_name}  ARGUMENTS = ${arguments}`,
        );
        console.log(
          "Enter 'y' to authorise command, 'y -N' to run N continuous " +
            "commands, 'n' to exit program, or enter feedback for " +
            `${this.ai_name}...`,
        );

        while (true) {
          const console_input = cleanInput('Input:');
          if (console_input.toLowerCase().trim() === 'y') {
            this.user_input = 'GENERATE NEXT COMMAND JSON';
            break;
          } else if (console_input.toLowerCase().startsWith('y -')) {
            try {
              this.next_action_count = Math.abs(
                parseInt(console_input.split(' ')[1]),
              );
              this.user_input = 'GENERATE NEXT COMMAND JSON';
            } catch (e) {
              console.log(
                "Invalid input format. Please enter 'y -n' where n is" +
                  ' the number of continuous tasks.',
              );
              continue;
            }
            break;
          } else if (console_input.toLowerCase() === 'n') {
            this.user_input = 'EXIT';
            break;
          } else {
            this.user_input = console_input;
            command_name = 'human_feedback';
            break;
          }
        }

        if (this.user_input === 'GENERATE NEXT COMMAND JSON') {
          logger.typewriter_log(
            '-=-=-=-=-=-=-= COMMAND AUTHORISED BY USER -=-=-=-=-=-=-=',
            'magenta',
            '',
          );
        } else if (this.user_input === 'EXIT') {
          console.log('Exiting...');
          break;
        }
      } else {
        logger.typewriter_log(
          'NEXT ACTION: ',
          'cyan',
          `COMMAND = ${command_name}  ARGUMENTS = ${arguments}`,
        );
      }

      let result: string;
      if (
        command_name !== null &&
        command_name.toLowerCase().startsWith('error')
      ) {
        result = `Command ${command_name} threw the following error: ${arguments}`;
      } else if (command_name === 'human_feedback') {
        result = `Human feedback: ${this.user_input}`;
      } else {
        result = `Command ${command_name} returned: ${cmd.execute_command(
          command_name,
          arguments,
        )}`;
        if (this.next_action_count > 0) {
          this.next_action_count -= 1;
        }
      }

      const memory_to_add =
        `Assistant Reply: ${assistant_reply} ` +
        `\nResult: ${result} ` +
        `\nHuman Feedback: ${this.user_input} `;

      this.memory.add(memory_to_add);

      if (result !== null) {
        this.full_message_history.push(create_chat_message('system', result));
        logger.typewriter_log('SYSTEM: ', 'yellow', result);
      } else {
        this.full_message_history.push(
          create_chat_message('system', 'Unable to execute command'),
        );
        logger.typewriter_log(
          'SYSTEM: ',
          'yellow',
          'Unable to execute command',
        );
      }
    }
  }
}

async function chat_with_ai(
  prompt: string,
  user_input: string,
  full_message_history: any[],
  memory: any,
  fast_token_limit: number,
) {
  // TODO: Implement chat_with_ai function
}

function create_chat_message(sender: string, content: string) {
  // TODO: Implement create_chat_message function
}

function attempt_to_fix_json_by_finding_outermost_brackets(
  json_string: string,
) {
  // TODO: Implement attempt_to_fix_json_by_finding_outermost_brackets function
}

function print_assistant_thoughts(ai_name: string, assistant_reply: string) {
  // TODO: Implement print_assistant_thoughts function
}
