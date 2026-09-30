export interface AeroExample {
  id: string;
  name: string;
  description: string;
  code: string;
}

export const EXAMPLES: AeroExample[] = [
  {
    id: 'demo',
    name: 'Standard Demo (demo.aero)',
    description: 'The official demonstration script featuring variables, I/O, conditionals, and cycle loops.',
    code: `START
NUM : age = 50, remaining = 3;
CHR : grade = 'A';
GET(age);
PRINT("Welcome");
TEST(age > 18 && grade == 'A') {
    PRINT(age);
}
RETEST(age == 18) {
    PRINT("Exactly eighteen");
}
OTHERWISE {
    PRINT("Under eighteen");
}
CYCLE(remaining > 0) {
    PRINT(remaining);
    remaining = remaining - 1;
}
END`,
  },
  {
    id: 'errors',
    name: 'Lexical Error Showcase',
    description: 'Showcases various lexical errors: invalid identifiers starting with digits, unterminated strings, invalid characters.',
    code: `START
NUM : 1count = 50;
CHR : flag = 'AB';
NUM : price = 2a0;
PRINT("Unterminated string literal);
NUM : rate = 10 % 3;
UNKNOWN @ symbol $ here
END`,
  },
  {
    id: 'variables',
    name: 'Variables & Data Types',
    description: 'Declaring NUM (integer) and CHR (character) constants and variables with assignment and delimiters.',
    code: `START
NUM : total_score = 100, bonus = 15;
CHR : initial = 'K', status = 'P';
PRINT("Student Score Summary");
PRINT(total_score);
total_score = total_score + bonus;
PRINT(total_score);
END`,
  },
  {
    id: 'logic',
    name: 'Relational & Logical Expressions',
    description: 'Complex boolean conditions using relational (==, !=, <, >, <=, >=) and logical (&&, ||, !) operators.',
    code: `START
NUM : x = 25, y = 30;
CHR : flag = 'Y';
TEST((x < y && flag == 'Y') || !(x >= 50)) {
    PRINT("Condition satisfied");
}
RETEST(x == y) {
    PRINT("Equal values");
}
OTHERWISE {
    PRINT("Default branch");
}
END`,
  },
  {
    id: 'cycle',
    name: 'CYCLE Loop (Factorial/Countdown)',
    description: 'Iterative calculation using CYCLE loop construct with arithmetic operators.',
    code: `START
NUM : n = 5, result = 1;
CYCLE(n > 1) {
    result = result * n;
    n = n - 1;
}
PRINT("Factorial result:");
PRINT(result);
END`,
  },
];
