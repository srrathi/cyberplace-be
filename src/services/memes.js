// src/services/memeService.js
const geminiService = require('./gemini/service');
const messageService = require('../ws/ws');
const { DatabaseService } = require('../database/db');
const { logger } = require('../utils/logger');

class MemeService extends DatabaseService {
    constructor() {
        super();
    }

    async createMeme(memeData) {
        try {
            const { text, image_url, tags, username } = memeData;

            // Generate caption and vibe description using Gemini
            const [caption, vibe_description] = await Promise.all([
                geminiService.generateMemeCaption(tags),
                geminiService.generateMemeVibeDescription(tags)
            ]);

            const memePayload = {
                text,
                image_url,
                meta: JSON.stringify({ tags }),
                caption: caption.substring(0, 500), // Limit caption length
                vibe_description: vibe_description.substring(0, 1000), // Limit description length
                upvote_count: 0,
                downvote_count: 0,
                total_bid_amount: 0,
                username,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const newMeme = await this.create('memes', memePayload);

            // Broadcast new meme to all users
            messageService.broadcastNewMeme(newMeme);

            logger.info(`New meme created by ${username} with ID: ${newMeme.id}`);
            return newMeme;
        } catch (error) {
            logger.error('Error creating meme:', error);
            throw error;
        }
    }

    async getMemesForUser(username, options = {}) {
        try {
            const client = this.client();

            // Get memes with bid summary join
            const { data: memes, error } = await client
                .from('memes')
                .select(`
          *,
          bid_summaries (
            bid_amount,
            username,
            transaction_id
          )
        `)
                .eq('username', username)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return memes.map(meme => ({
                ...meme,
                tags: typeof meme.meta === 'string' ? JSON.parse(meme.meta)?.tags : meme.meta,
                top_bidder: meme.bid_summaries?.[0] || null
            }));
        } catch (error) {
            logger.error('Error fetching user memes:', error);
            throw error;
        }
    }

    async bidOnMeme(bidData) {
        try {
            const { meme_id, username, bid_amount } = bidData;
            const transaction_id = `bid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const client = this.client();

            // Start transaction
            const { data: meme, error: memeError } = await client
                .from('memes')
                .select('total_bid_amount, username')
                .eq('id', meme_id)
                .single();

            if (memeError) throw memeError;

            // Create bid entry
            await this.create('bids', {
                transaction_id,
                meme_id,
                username,
                bid_amount,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

            // Update meme total bid amount
            const newTotalBidAmount = (meme.total_bid_amount || 0) + bid_amount;
            await this.update('memes', meme_id, {
                total_bid_amount: newTotalBidAmount,
                updated_at: new Date().toISOString()
            });

            // Update or create bid summary (highest bid)
            const { data: existingBidSummary } = await client
                .from('bid_summaries')
                .select('bid_amount')
                .eq('meme_id', meme_id)
                .single();

            if (!existingBidSummary || bid_amount > existingBidSummary.bid_amount) {
                await client
                    .from('bid_summaries')
                    .upsert({
                        meme_id,
                        transaction_id,
                        bid_amount,
                        username
                    });
            }

            // Update meme's top bidder
            const { data: updatedMeme } = await client
                .from('memes')
                .select('upvote_count, downvote_count, text, total_bid_amount')
                .eq('id', meme_id)
                .single();
            if (!updatedMeme) {
                throw new Error(`Meme with ID ${meme_id} not found`);
            }


            // Broadcast bid update
            messageService.broadcastBidUpdate(username, bid_amount, meme_id, updatedMeme.total_bid_amount, updatedMeme.text);

            // Update leaderboard
            messageService.updateLeaderboard();

            logger.info(`Bid placed: ${username} bid ${bid_amount} on meme ${meme_id}`);
            return { transaction_id, success: true };
        } catch (error) {
            logger.error('Error placing bid:', error);
            throw error;
        }
    }

    async voteOnMeme(voteData) {
        try {
            const { meme_id, username, voted } = voteData; // voted: 1 for up, 0 for down

            const client = this.client();

            // Check if user already voted
            const { data: existingVote } = await client
                .from('votes')
                .select('*')
                .eq('meme_id', meme_id)
                .eq('username', username)
                .eq('is_active', true)
                .single();

            let voteType = voted === 1 ? 'up' : 'down';
            let countField = voted === 1 ? 'upvote_count' : 'downvote_count';

            if (existingVote) {
                // Update existing vote
                await this.update('votes', existingVote.id, {
                    voted,
                    updated_at: new Date().toISOString()
                });

                // Adjust counts based on previous vote
                const { data: meme } = await client
                    .from('memes')
                    .select('upvote_count, downvote_count')
                    .eq('id', meme_id)
                    .single();

                let upvoteChange = 0, downvoteChange = 0;

                if (existingVote.voted !== voted) {
                    if (voted === 1) {
                        upvoteChange = 1;
                        downvoteChange = -1;
                    } else {
                        upvoteChange = -1;
                        downvoteChange = 1;
                    }
                }

                await this.update('memes', meme_id, {
                    upvote_count: Math.max(0, meme.upvote_count + upvoteChange),
                    downvote_count: Math.max(0, meme.downvote_count + downvoteChange),
                    updated_at: new Date().toISOString()
                });
            } else {
                // Create new vote
                await this.create('votes', {
                    meme_id,
                    username,
                    voted,
                    is_active: true
                });

                // Increment appropriate count
                const { data: meme } = await client
                    .from('memes')
                    .select(countField)
                    .eq('id', meme_id)
                    .single();

                await this.update('memes', meme_id, {
                    [countField]: (meme[countField] || 0) + 1,
                    updated_at: new Date().toISOString()
                });
            }

            // Get updated counts for broadcasting
            const { data: updatedMeme } = await client
                .from('memes')
                .select('upvote_count, downvote_count, text' )
                .eq('id', meme_id)
                .single();

            // Broadcast vote update
            messageService.broadcastVoteUpdate(
                meme_id,
                voteType,
                username,
                voted === 1 ? updatedMeme.upvote_count : updatedMeme.downvote_count,
                updatedMeme.text,
                updatedMeme.upvote_count,
                updatedMeme.downvote_count
            );

            // Update leaderboard
            messageService.updateLeaderboard();

            // Check if this meme should be highlighted (trending logic)
            await this.checkAndBroadcastTrendingMeme(meme_id);

            logger.info(`Vote placed: ${username} ${voteType}voted meme ${meme_id}`);
            return { success: true };
        } catch (error) {
            logger.error('Error voting on meme:', error);
            throw error;
        }
    }

    async checkAndBroadcastTrendingMeme(meme_id) {
        try {
            // Get memes with most upvotes in the last 10 minutes
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

            const client = this.client();
            const { data: recentMemes } = await client
                .from('memes')
                .select('id, upvote_count')
                .gte('updated_at', tenMinutesAgo)
                .order('upvote_count', { ascending: false })
                .limit(1);

            if (recentMemes && recentMemes.length > 0 && recentMemes[0].id === meme_id) {
                // This meme has the most upvotes in the last 10 minutes
                const upvoteCount = recentMemes[0].upvote_count;

                // Only broadcast if it's a significant milestone (multiples of 10)
                if (upvoteCount > 0 && upvoteCount % 10 === 0) {
                    messageService.broadcastMemeHighlight(meme_id, upvoteCount);
                }
            }
        } catch (error) {
            logger.error('Error checking trending meme:', error);
            // Don't throw error as this is not critical
        }
    }

    async getLeaderboard(options = {}) {
        try {
            const {
                page = 1,
                pageSize = 20,
                sortBy = 'upvote_count', // upvote_count, downvote_count, total_bid_amount
                sortOrder = 'desc',
                filters = {}
            } = options;

            const offset = (page - 1) * pageSize;
            const client = this.client();

            let query = client
                .from('memes')
                .select(`
          *,
          bid_summaries (
            bid_amount,
            username,
            transaction_id
          )
        `)
                .eq('is_active', true);

            // Apply filters
            if (filters.username) {
                query = query.eq('username', filters.username);
            }
            if (filters.minUpvotes) {
                query = query.gte('upvote_count', filters.minUpvotes);
            }
            if (filters.minBidAmount) {
                query = query.gte('total_bid_amount', filters.minBidAmount);
            }

            // Apply sorting
            query = query.order(sortBy, { ascending: sortOrder === 'asc' });

            // Apply pagination
            query = query.range(offset, offset + pageSize - 1);

            const { data: memes, error } = await query;
            if (error) throw error;

            // Get total count for pagination
            const { count, error: countError } = await client
                .from('memes')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            if (countError) throw countError;

            return {
                memes: memes.map(meme => ({
                    ...meme,
                    tags: typeof meme.meta === 'string' ? JSON.parse(meme.meta)?.tags : meme.meta,
                    top_bidder: meme.bid_summaries?.[0] || null
                })),
                pagination: {
                    page,
                    pageSize,
                    total: count,
                    totalPages: Math.ceil(count / pageSize)
                }
            };
        } catch (error) {
            logger.error('Error fetching leaderboard:', error);
            throw error;
        }
    }
}

module.exports = new MemeService();
