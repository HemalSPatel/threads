"use server"

import { revalidatePath } from "next/cache";
import { threadId } from "worker_threads";
import { string } from "zod";
import Thread from "../models/thread.model";
import User from "../models/user.model";
import { connectToDB } from "../mongoose"
import { ThreadValidation } from "../validations/thread";

interface Params {
    text: string,
    author: string,
    communityId: string | null,
    path: string
}

export async function createThread({text, author, communityId, path}: Params) {
    try {
        connectToDB();
    
    const createdThread = await Thread.create({
        text,
        author,
        community: null
    }); 

    // Update user model
    await User.findByIdAndUpdate(author, {
        $push: { threads: createdThread._id }
    })

    revalidatePath(path); //makes sure that the changes happen immediatly 
    } catch (error: any) {
        throw new Error(`Error creathing thread: ${error.message}`)
    }
    
    
}  

export async function fetchPosts(pageNumber = 1, pageSize = 20) {
    connectToDB();

    //need to calculate the number of posts that need to be skipped depending on the page that we are on
    const skipAmount = (pageNumber - 1) * pageSize;

    //we fetch the threads that have no parents (meaning they are top-level threads)
    const postQuery = Thread.find({parentId: {$in: [null, undefined]}})
        .sort({createdAt: 'desc'})
        .skip(skipAmount)
        .limit(pageSize)
        .populate({path: 'author', model: User})
        .populate({
            path: 'children',
            populate: {
                path: 'author',
                model: User,
                select: '_id name parentId image'
            } 
        })

    const totalPostsCount =  await Thread.countDocuments({parentId: {$in: [null, undefined]}})

    const posts = await postQuery.exec();

    const isNext = totalPostsCount > skipAmount + posts.length;

    return {posts, isNext};

}

export async function fetchThreadById(id: string){
    connectToDB();

    try {
        //populate community

        const thread = await Thread.findById(id)
            .populate({
                path: "author",
                model: User,
                select: "_id id name image"
            })
            .populate({
                path: 'children',
                populate: [
                    {
                        path: 'author',
                        model: User,
                        select: "_id id name parentId image"
                    },
                    {
                        path: 'children',
                        model: Thread,
                        populate: {
                            path: 'author',
                            model: User,
                            select: "_id id name parentId image"
                        }
                    }
                ]
            }).exec();

        return thread;
    } catch (error: any) {
        throw new Error (`Error fetching thread: ${error.message}}`)
    }
}

export async function addCommentToThread(
    threadId: string,
    commentText: string,
    userId: string,
    path: string,
) {
    connectToDB();

    try {
        //Adding a comment to a thread
        //First find the original comment by its ID
        const originalThread = await Thread.findById(threadId);
        //Create a new thread with the comment text
        const commentThread = new Thread({
            text: commentText,
            author: userId,
            parentId: threadId,

        })

        //save the new thread to the database
        const savedCommentThread = await commentThread.save();

        //update the original thread to include the comment
        originalThread.children.push(savedCommentThread._id);
 
        //save the original thread 
        await originalThread.save();

        revalidatePath(path); 

        if(!originalThread) {
            throw new Error("Thread not found")
        }



    } catch (error: any) {
        throw new Error(`Error adding comment to Thread: ${error}`)
    }
}