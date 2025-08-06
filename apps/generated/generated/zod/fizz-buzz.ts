import * as z from 'zod'

export const FizzBuzzString = z.object({
  value: z.enum([
    '1',
    '2',
    'Fizz',
    '4',
    'Buzz',
    'Fizz',
    '7',
    '8',
    'Fizz',
    'Buzz',
    '11',
    'Fizz',
    '13',
    '14',
    'FizzBuzz',
    '16',
    '17',
    'Fizz',
    '19',
    'Buzz',
  ]),
})

export type FizzBuzzString = z.infer<typeof FizzBuzzString>
