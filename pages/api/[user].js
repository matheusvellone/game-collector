import Promise from 'bluebird'
import * as sources from '../sources'
import { getRowsForUser } from '../sources/dynamodb'

export default async (req, res) => {
  const { PASSWORD } = process.env

  if (!PASSWORD) {
    res.statusCode = 403
    res.json({
      password: 'No password configured',
    })
    return
  }

  const { query } = req

  const { password } = query

  if (password !== PASSWORD) {
    res.statusCode = 403
    res.json({
      message: 'Wrong password',
    })
    return
  }

  const { user } = query

  const rows = await getRowsForUser(user)

  await Promise.map(rows, async (row) => {
    try {
      console.log(`Executing ${row.source} for ${user}`)
      await sources[row.source](row)
    } catch (error) {
      console.error({
        message: `${row.source} failed for ${user}`,
        error,
      })
    }
  })

  res.statusCode = 200
  res.json({})
}
