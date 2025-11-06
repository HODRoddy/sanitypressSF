import { notFound } from 'next/navigation'
import Modules from '@/ui/modules'
import processMetadata from '@/lib/processMetadata'
import { client } from '@/sanity/lib/client'
import { fetchSanityLive } from '@/sanity/lib/fetch'
import { groq } from 'next-sanity'
import {
	IMAGE_QUERY,
	MODULES_QUERY,
	TRANSLATIONS_QUERY,
} from '@/sanity/lib/queries'
import { languages, type Lang } from '@/lib/i18n'

export default async function Page({ params }: Props) {
	const post = await getPost(await params)
	if (!post) notFound()
	return <Modules modules={post.modules} post={post} />
}

export async function generateMetadata({ params }: Props) {
	const post = await getPost(await params)
	if (!post) notFound()
	return processMetadata(post)
}

async function getPost(params: Params) {
	const { slug, lang } = processSlug(params)

	return await fetchSanityLive<Sanity.Page & { modules: Sanity.Module[] }>({
		query: groq`*[
			_type == 'page'
			&& metadata.slug.current == $slug
			${lang ? `&& language == '${lang}'` : ''}
		][0]{
			...,
			body[]{
				...,
				_type == 'image' => {
					${IMAGE_QUERY},
					asset->
				}
			},
			metadata {
				...,
				'ogimage': image.asset->url + '?w=1200'
			},
			'modules': (
				// global modules (before)
				*[_type == 'global-module' && path == '*'].before[]{ ${MODULES_QUERY} }
				// path modules (before)
				+ *[_type == 'global-module' && path == '/'].before[]{ ${MODULES_QUERY} }
				// page modules
				+ modules[]{ ${MODULES_QUERY} }
				// path modules (after)
				+ *[_type == 'global-module' && path == '/'].after[]{ ${MODULES_QUERY} }
				// global modules (after)
				+ *[_type == 'global-module' && path == '*'].after[]{ ${MODULES_QUERY} }
			),
			${TRANSLATIONS_QUERY},
		}`,
		params: { slug },
	})
}

type Params = { slug: string[] }

type Props = {
	params: Promise<Params>
}

function processSlug(params: Params) {
	const lang = languages.includes(params.slug[0] as Lang)
		? params.slug[0]
		: undefined

	const slug = params.slug.join('/')

	return {
		slug: lang ? slug.replace(new RegExp(`^${lang}/`), '') : slug,
		lang,
	}
}
