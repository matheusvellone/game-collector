import { URLSearchParams } from 'url'
import axios from 'axios'
import moment from 'moment'
import cheerio from 'cheerio'
import Promise from 'bluebird'

const createInstance = (cookie) => {
  return axios.create({
    baseURL: 'https://www.steamgifts.com',
    headers: {
      cookie,
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
  })
}

const getGiveaways = async (instance) => {
  return [
    ... await getGiveawaysFromPage(instance, '/giveaways/search?copy_min=2'),
    ... await getGiveawaysFromPage(instance, '/giveaways/search?type=group'),
    ... await getGiveawaysFromPage(instance, '/giveaways/search?type=wishlist', { wishlist: true }),
    ... await getGiveawaysFromPage(instance, '/', { top: 2 }),
  ]
}

const selectGiveaways = giveaways => {
  giveaways.sort((a, b) => b.score - a.score)

  return giveaways.filter((giveaway) => {
    return !giveaway.alreadyEntered && giveaway.end < 120
  })
}

const getGiveawaysFromPage = async (instance, page, options = {}) => {
  const { data: body } = await instance.get(page)
  const $ = cheerio.load(body)

  let pageGiveaways = []

  $('.giveaway__row-outer-wrap').each((index, giveaway) => {
    const $giveaway = $(giveaway)

    const giveawayData = extractGiveawayData($giveaway, options)

    pageGiveaways.push(giveawayData)
  })

  pageGiveaways = selectGiveaways(pageGiveaways)

  if (options.top) {
    pageGiveaways.length = options.top
  }

  return pageGiveaways
}

const extractGiveawayData = (giveawayRoot, {
  wishlist,
} = {}) => {
  const now = moment()
  const header = giveawayRoot.find('a.giveaway__heading__name')

  const game = header.text()
  const [, code] = giveawayRoot.find('a.giveaway__heading__name').attr('href').match(/giveaway\/(.+?)\/.*/)
  const alreadyEntered = giveawayRoot.find('.giveaway__row-inner-wrap').hasClass('is-faded')

  let points
  let copies

  if (giveawayRoot.find('.giveaway__heading__thin').length === 2) {
    copies = Number(giveawayRoot.find('.giveaway__heading__thin:nth-child(2)').text().match(/\d+/)[0])
    points = Number(giveawayRoot.find('.giveaway__heading__thin:nth-child(3)').text().match(/\d+/)[0])
  } else {
    points = Number(giveawayRoot.find('.giveaway__heading__thin:nth-child(2)').text().match(/\d+/)[0])
    copies = 1
  }

  const levelText = giveawayRoot.find('.giveaway__column--contributor-level').text()
  let level = 0

  if (levelText !== '') {
    level = Number(levelText.match(/\d+/)[0])
  }

  const group = giveawayRoot.find('.giveaway__column--group').length > 0

  const currentParticipants = Number(giveawayRoot.find('.giveaway__links > a:nth-child(1) > span').text().replace(',', '').match(/\d+/)[0])
  const end = moment(giveawayRoot.find('span[data-timestamp]').first().data('timestamp') * 1000).diff(now, 'minutes')
  const created = moment(giveawayRoot.find('span[data-timestamp]').last().data('timestamp') * 1000).diff(now, 'minutes')

  let score = 1000 / (end + (currentParticipants/1000) + points) * copies * (level + 1) * (group ? 2 : 1) * (wishlist ? 10 : 1)

  return {
    alreadyEntered,
    code,
    copies,
    created,
    currentParticipants,
    end,
    game,
    group,
    level,
    points,
    score,
  }
}

const enterGiveaway = instance => async (giveaway) => {
  const { data: body } = await instance.get(`/giveaway/${giveaway.code}/`)

  const $ = cheerio.load(body)

  const xsrfToken = $('input[name=xsrf_token]').val()

  const reqBody = {
    do: 'entry_insert',
    code: giveaway.code,
    xsrf_token: xsrfToken,
  }
  const postBody = new URLSearchParams(reqBody)
  await instance.post('/ajax.php', postBody)
}

export default async ({ cookie }) => {
  const instance = createInstance(cookie)

  let giveaways = await getGiveaways(instance)

  giveaways = selectGiveaways(giveaways)

  console.table(giveaways)

  await Promise.each(giveaways, enterGiveaway(instance))
}
